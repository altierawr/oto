package recommendations

import (
	"context"
	"errors"
	"fmt"
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
	lastfmErrorNotFoundStr = "Last.fm Error: 6 - Track not found"
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
		wg.Go(func() {
			s.runWorker()
		})
	}

	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()

	s.updateUserRecommendations()

	for loop := true; loop; {
		select {
		case <-s.stop:
			loop = false
		case <-ticker.C:
			s.updateUserRecommendations()
		}
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

	similarTracks, err := s.lastFm.Track.Similar(lastfm.TrackSimilarParams{
		Artist: artistName,
		Track:  title,
	})
	if err != nil {
		switch {
		case err.Error() == lastfmErrorNotFoundStr:
			s.logger.Warn("couldn't find track when doing similar track search",
				"artist", artistName,
				"track", title)
		default:
			return err
		}
	}

	s.handleSimilarTracksResponse(trackId, similarTracks)

	if len(similarTracks.Tracks) > 0 {
		return nil
	}

	// if couldn't get any similar tracks, fall back to selecting another track from the artist
	trackInfo, err := s.lastFm.Track.Info(lastfm.TrackInfoParams{
		Artist: artistName,
		Track:  title,
	})
	if err != nil {
		switch {
		case err.Error() == lastfmErrorNotFoundStr:
			s.logger.Warn("couldn't find track when doing similar track search",
				"artist", artistName,
				"track", title)
		default:
			return err
		}
	}

	success, err := s.handleArtistTopTracks(ctx, trackInfo.Artist.MBID, artistName, trackId)
	if err != nil {
		return err
	}

	if success {
		return nil
	}

	similarArtists := &lastfm.SimilarArtists{}

	if trackInfo != nil && trackInfo.Artist.MBID != "" {
		similarArtists, err = s.lastFm.Artist.SimilarByMBID(lastfm.ArtistSimilarMBIDParams{
			MBID: trackInfo.Artist.MBID,
		})
	} else {
		similarArtists, err = s.lastFm.Artist.Similar(lastfm.ArtistSimilarParams{
			Artist: artistName,
		})
	}

	if err != nil {
		return err
	}

	fmt.Println(len(similarArtists.Artists), "artists")
	if len(similarArtists.Artist) > 0 {
		limit := 50
		for idx, artist := range similarArtists.Artists {
			fmt.Println("Similar artist:", artist.Name)
			if idx+1 > limit {
				break
			}

			success, err = s.handleArtistTopTracks(ctx, artist.MBID, artist.Name, trackId)
			if err != nil {
				return err
			}

			if success {
				break
			}
		}
	}

	if !success {
		s.logger.Warn("couldn't find any lastfm tracks to recommend for a track",
			"artistName", artistName,
			"title", title)
	}

	return nil
}

func (s *Service) handleArtistTopTracks(ctx context.Context, artistMBId string, artistName string, trackId int64) (bool, error) {
	artistTopTracks := &lastfm.ArtistTopTracks{}

	var err error
	if artistMBId != "" {
		artistTopTracks, err = s.lastFm.Artist.TopTracksByMBID(lastfm.ArtistTopTracksMBIDParams{
			MBID: artistMBId,
		})
	} else {
		artistTopTracks, err = s.lastFm.Artist.TopTracks(lastfm.ArtistTopTracksParams{
			Artist: artistName,
		})
	}

	if err != nil {
		return false, err
	}

	if artistTopTracks == nil || len(artistTopTracks.Tracks) == 0 {
		return false, nil
	}

	wasSuccesful := false
	limit := 1
	for idx, track := range artistTopTracks.Tracks {
		if idx+1 > limit {
			break
		}

		if track.Artist.Name == "" || track.Title == "" {
			continue
		}

		if err := s.limiter.Wait(ctx); err != nil {
			return false, err
		}

		similarTracks := &lastfm.SimilarTracks{}

		if track.MBID != "" {
			similarTracks, err = s.lastFm.Track.SimilarByMBID(lastfm.TrackSimilarMBIDParams{
				MBID: track.MBID,
			})
		} else {
			similarTracks, err = s.lastFm.Track.Similar(lastfm.TrackSimilarParams{
				Artist: track.Artist.Name,
				Track:  track.Title,
			})
		}

		if err != nil {
			return false, err
		}

		if len(similarTracks.Tracks) == 0 {
			fmt.Println("no similar tracks for", track.Title)
			continue
		}

		s.handleSimilarTracksResponse(trackId, similarTracks)
		wasSuccesful = true
		break
	}

	return wasSuccesful, nil
}

func (s *Service) handleSimilarTracksResponse(trackId int64, similarTracks *lastfm.SimilarTracks) {
	for _, recommendedTrack := range similarTracks.Tracks {
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
