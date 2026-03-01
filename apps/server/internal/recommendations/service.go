package recommendations

import (
	"context"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/database"
	"github.com/twoscott/gobble-fm/api"
	"github.com/twoscott/gobble-fm/lastfm"
	"golang.org/x/time/rate"
)

const (
	defaultQueueSize = 256
	maxAttempts      = 3
	workerCount      = 10
)

var retryBackoffs = []time.Duration{
	500 * time.Millisecond,
	1 * time.Second,
	2 * time.Second,
}

type queueItem struct {
	trackID int64
	attempt int
}

type Service struct {
	db     *database.DB
	lastFm *api.Client
	logger *slog.Logger

	limiter *rate.Limiter
	writeMu sync.Mutex
	queue   chan queueItem
	stop    chan struct{}
	done    chan struct{}
}

func New(db *database.DB, lastFm *api.Client, logger *slog.Logger) *Service {
	return &Service{
		db:      db,
		lastFm:  lastFm,
		logger:  logger,
		limiter: rate.NewLimiter(rate.Every(100*time.Millisecond), 1),
		queue:   make(chan queueItem, defaultQueueSize),
		stop:    make(chan struct{}),
		done:    make(chan struct{}),
	}
}

func (s *Service) Enqueue(trackID int64) {
	s.enqueueItem(queueItem{
		trackID: trackID,
		attempt: 0,
	})
}

func (s *Service) Run() {
	defer close(s.done)

	var wg sync.WaitGroup
	for range workerCount {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.runWorker()
		}()
	}

	<-s.stop
	wg.Wait()
}

func (s *Service) Stop() {
	select {
	case <-s.stop:
	default:
		close(s.stop)
	}

	<-s.done
}

func (s *Service) SyncIfMissing(ctx context.Context, trackID int64) error {
	if s.lastFm == nil {
		return errors.New("last fm client is not configured")
	}

	hasRecommendations, err := s.db.HasTidalTrackLastfmRecommendations(trackID)
	if err != nil {
		return err
	}

	if hasRecommendations {
		return nil
	}

	return s.fetchAndStoreSimilar(ctx, trackID)
}

func (s *Service) handleQueueItem(item queueItem) {
	if s.lastFm == nil {
		return
	}

	hasRecommendations, err := s.db.HasTidalTrackLastfmRecommendations(item.trackID)
	if err != nil {
		s.retryOrLog(item, err)
		return
	}

	if hasRecommendations {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	s.logger.Info("fetching tidal track recommendations",
		"trackId", item.trackID)
	err = s.fetchAndStoreSimilar(ctx, item.trackID)
	if err == nil {
		return
	}

	s.retryOrLog(item, err)
}

func (s *Service) fetchAndStoreSimilar(ctx context.Context, trackId int64) error {
	track, err := s.db.GetTidalTrack(trackId)
	if err != nil {
		return err
	}

	if len(track.Artists) == 0 {
		return errors.New("tidal track is missing artists")
	}

	artistName := strings.TrimSpace(track.Artists[0].Name)
	title := strings.TrimSpace(track.Title)
	if artistName == "" || title == "" {
		return errors.New("tidal track is missing artist name or title")
	}

	if err := s.limiter.Wait(ctx); err != nil {
		return err
	}

	result, err := s.lastFm.Track.Similar(lastfm.TrackSimilarParams{
		Artist: artistName,
		Track:  title,
	})
	if err != nil {
		return err
	}

	for _, recommendedTrack := range result.Tracks {
		s.writeMu.Lock()

		lastfmTitle := strings.TrimSpace(recommendedTrack.Title)
		lastfmArtist := strings.TrimSpace(recommendedTrack.Artist.Name)
		if lastfmTitle == "" || lastfmArtist == "" {
			s.writeMu.Unlock()
			continue
		}

		duration := recommendedTrack.Duration
		var artistMBId *string
		if recommendedTrack.Artist.MBID != "" {
			mbid := recommendedTrack.Artist.MBID
			artistMBId = &mbid
		}

		lastfmTrack := data.LastfmTrack{
			Title:      lastfmTitle,
			Duration:   &duration,
			ArtistName: lastfmArtist,
			ArtistMbid: artistMBId,
		}

		storedTrack, err := s.db.InsertLastFmTrack(&lastfmTrack, nil)
		if err != nil {
			s.writeMu.Unlock()
			s.logger.Error("couldn't insert lastfm track",
				"error", err.Error(),
				"tidalTrackId", trackId,
				"artist", lastfmArtist,
				"title", lastfmTitle,
			)
			continue
		}

		err = s.db.LinkTidalToLastfm(trackId, storedTrack.ID, recommendedTrack.Match)
		s.writeMu.Unlock()
		if err != nil {
			s.logger.Error("couldn't link tidal and lastfm tracks",
				"error", err.Error(),
				"tidalTrackId", trackId,
				"lastfmTrackId", storedTrack.ID,
			)
			continue
		}
	}

	return nil
}

func (s *Service) enqueueItem(item queueItem) bool {
	select {
	case <-s.stop:
		return false
	default:
	}

	select {
	case <-s.stop:
		return false
	case s.queue <- item:
		return true
	default:
		s.logger.Warn("recommendation queue is full; dropping track",
			"trackID", item.trackID,
			"attempt", item.attempt,
		)
		return false
	}
}

func (s *Service) retryOrLog(item queueItem, err error) {
	if !s.shouldRetry(err) || item.attempt >= maxAttempts-1 {
		s.logger.Error("recommendation sync failed",
			"error", err.Error(),
			"trackID", item.trackID,
			"attempt", item.attempt,
		)
		return
	}

	backoff := retryBackoffs[item.attempt]
	nextItem := queueItem{
		trackID: item.trackID,
		attempt: item.attempt + 1,
	}

	time.AfterFunc(backoff, func() {
		s.enqueueItem(nextItem)
	})
}

func (s *Service) shouldRetry(err error) bool {
	if errors.Is(err, database.ErrRecordNotFound) {
		return true
	}

	var lastFmErr *api.LastFMError
	if errors.As(err, &lastFmErr) {
		return lastFmErr.ShouldRetry()
	}

	var httpErr *api.HTTPError
	if errors.As(err, &httpErr) {
		return httpErr.StatusCode == 429 || httpErr.StatusCode >= 500
	}

	return strings.Contains(strings.ToLower(err.Error()), "rate limit")
}

func (s *Service) runWorker() {
	for {
		select {
		case <-s.stop:
			return
		case item := <-s.queue:
			s.handleQueueItem(item)
		}
	}
}
