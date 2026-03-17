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
	"github.com/altierawr/oto/internal/tidal"
	"github.com/twoscott/gobble-fm/api"
	"github.com/twoscott/gobble-fm/lastfm"
	"golang.org/x/time/rate"
)

const (
	lastfmErrorNotFoundStr = "Last.fm Error: 6 - Track not found"
)

const (
	defaultQueueSize = 1_000_000
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
	tidal  *tidal.Service

	ctx    context.Context
	cancel context.CancelFunc

	lowPrioLimiter  *rate.Limiter
	highPrioLimiter *rate.Limiter
	writeMu         sync.Mutex
	queue           chan queueItem
	stop            chan struct{}
	done            chan struct{}
}

func New(db *database.DB, lastFm *api.Client, logger *slog.Logger, tidal *tidal.Service) *Service {
	ctx, cancel := context.WithCancel(context.Background())
	return &Service{
		db:              db,
		lastFm:          lastFm,
		logger:          logger,
		tidal:           tidal,
		ctx:             ctx,
		cancel:          cancel,
		lowPrioLimiter:  rate.NewLimiter(rate.Every(1*time.Second/5), 1),
		highPrioLimiter: rate.NewLimiter(rate.Every(1*time.Second/5), 1),
		queue:           make(chan queueItem, defaultQueueSize),
		stop:            make(chan struct{}),
		done:            make(chan struct{}),
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

	ticker := time.NewTicker(60 * time.Minute)
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

	if s.cancel != nil {
		s.cancel()
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

	s.logger.Info("fetching tidal track recommendations for track",
		"trackId", trackID)
	return s.fetchAndStoreSimilar(ctx, s.highPrioLimiter, trackID)
}

func (s *Service) handleQueueItem(item queueItem) {
	select {
	case <-s.stop:
		return
	default:
	}

	if s.lastFm == nil {
		return
	}

	hasRecommendations, err := s.db.HasTidalTrackLastfmRecommendations(item.trackID)
	if err != nil {
		s.retryOrLog(item, err)
		return
	}

	if hasRecommendations {
		s.logger.Info("track already has recommendations",
			"trackId", item.trackID)
		return
	}

	s.logger.Info("fetching tidal track recommendations for track",
		"trackId", item.trackID)
	err = s.fetchAndStoreSimilar(s.ctx, s.lowPrioLimiter, item.trackID)
	if err == nil {
		return
	}

	s.retryOrLog(item, err)
}

func (s *Service) fetchAndStoreSimilar(ctx context.Context, limiter *rate.Limiter, trackId int64) error {
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

	if err := limiter.Wait(ctx); err != nil {
		return err
	}

	similarTracks, err := s.lastFm.Track.Similar(lastfm.TrackSimilarParams{
		Artist: artistName,
		Track:  title,
	})
	if err != nil && !strings.Contains(err.Error(), lastfmErrorNotFoundStr) {
		return err
	}

	err = s.handleSimilarTracksResponse(ctx, limiter, trackId, similarTracks)
	if err != nil {
		return err
	}

	if len(similarTracks.Tracks) > 0 {
		return nil
	}

	if err := limiter.Wait(ctx); err != nil {
		return err
	}

	// if couldn't get any similar tracks, fall back to selecting another track from the artist
	trackInfo, err := s.lastFm.Track.Info(lastfm.TrackInfoParams{
		Artist: artistName,
		Track:  title,
	})
	if err != nil && !strings.Contains(err.Error(), lastfmErrorNotFoundStr) {
		return err
	}

	select {
	case <-s.stop:
		return errors.New("stopped")
	default:
	}

	success, err := s.handleArtistTopTracks(ctx, limiter, trackInfo.Artist.MBID, artistName, trackId)
	if err != nil {
		return err
	}

	if success {
		return nil
	}

	similarArtists := &lastfm.SimilarArtists{}

	if err := limiter.Wait(ctx); err != nil {
		return err
	}
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

	if len(similarArtists.Artist) > 0 {
		limit := 50
		for idx, artist := range similarArtists.Artists {
			if idx+1 > limit {
				break
			}

			success, err = s.handleArtistTopTracks(ctx, limiter, artist.MBID, artist.Name, trackId)
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

func (s *Service) handleArtistTopTracks(ctx context.Context, limiter *rate.Limiter, artistMBId string, artistName string, trackId int64) (bool, error) {
	artistTopTracks := &lastfm.ArtistTopTracks{}

	if err := limiter.Wait(ctx); err != nil {
		return false, err
	}

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
		select {
		case <-s.stop:
			return false, errors.New("stopped")
		case <-ctx.Done():
			return false, ctx.Err()
		default:
		}

		if idx+1 > limit {
			break
		}

		if track.Artist.Name == "" || track.Title == "" {
			continue
		}

		if err := limiter.Wait(ctx); err != nil {
			return false, err
		}

		similarTracks := &lastfm.SimilarTracks{}

		if err := limiter.Wait(ctx); err != nil {
			return false, err
		}
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
			if strings.Contains(err.Error(), lastfmErrorNotFoundStr) {
				return false, nil
			}

			return false, err
		}

		if len(similarTracks.Tracks) == 0 {
			continue
		}

		err := s.handleSimilarTracksResponse(ctx, limiter, trackId, similarTracks)
		if err != nil {
			return false, err
		}

		wasSuccesful = true
		break
	}

	return wasSuccesful, nil
}

func (s *Service) handleSimilarTracksResponse(ctx context.Context, limiter *rate.Limiter, trackId int64, similarTracks *lastfm.SimilarTracks) error {
	for _, recommendedTrack := range similarTracks.Tracks {
		select {
		case <-s.stop:
			return errors.New("stopped")
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		lastfmTitle := strings.TrimSpace(recommendedTrack.Title)
		lastfmArtist := strings.TrimSpace(recommendedTrack.Artist.Name)
		if lastfmTitle == "" || lastfmArtist == "" {
			continue
		}

		var trackInfo *data.LastfmTrack
		if recommendedTrack.MBID != "" {
			track, err := s.db.GetLastfmTrackByMbid(recommendedTrack.MBID)
			if err != nil && !errors.Is(err, database.ErrRecordNotFound) {
				return err
			}

			trackInfo = track
		} else {
			track, err := s.db.GetLastfmTrackByArtistNameAndTitle(lastfmArtist, lastfmTitle)
			if err != nil && !errors.Is(err, database.ErrRecordNotFound) {
				return err
			}

			trackInfo = track
		}

		if trackInfo == nil && recommendedTrack.MBID != "" {
			if err := limiter.Wait(ctx); err != nil {
				s.logger.Error("couldn't wait on lastfm rate limiter",
					"error", err.Error())
				return err
			}

			info, err := s.lastFm.Track.InfoByMBID(lastfm.TrackInfoMBIDParams{
				MBID: recommendedTrack.MBID,
			})
			if err != nil {
				if !strings.Contains(err.Error(), lastfmErrorNotFoundStr) {
					s.logger.Warn("couldn't fetch lastfm track info by mbid",
						"error", err.Error(),
						"mbid", recommendedTrack.MBID,
						"artist", lastfmArtist,
						"title", lastfmTitle,
					)
				}
			} else {
				dur := info.Duration.Unwrap()

				var mbid *string
				if info.MBID != "" {
					mbid = &info.MBID
				}

				var artistMbid *string
				if info.Artist.MBID != "" {
					mbid = &info.Artist.MBID
				}

				var albumTitle *string
				if info.Album.Title != "" {
					albumTitle = &info.Album.Title
				}

				var albumMbid *string
				if info.Album.MBID != "" {
					albumMbid = &info.Album.MBID
				}

				trackInfo = &data.LastfmTrack{
					Mbid:       mbid,
					Title:      info.Title,
					Duration:   &dur,
					ArtistName: info.Artist.Name,
					ArtistMbid: artistMbid,
					AlbumTitle: albumTitle,
					AlbumMbid:  albumMbid,
				}
			}
		}

		if trackInfo == nil {
			if err := limiter.Wait(ctx); err != nil {
				s.logger.Error("couldn't wait on lastfm rate limiter",
					"error", err.Error())
				return err
			}

			info, err := s.lastFm.Track.Info(lastfm.TrackInfoParams{
				Artist: lastfmArtist,
				Track:  lastfmTitle,
			})
			if err != nil {
				if !strings.Contains(err.Error(), lastfmErrorNotFoundStr) {
					s.logger.Warn("couldn't fetch lastfm track info by artist/title",
						"error", err.Error(),
						"artist", lastfmArtist,
						"title", lastfmTitle,
					)
				}
			} else {
				dur := info.Duration.Unwrap()

				var mbid *string
				if info.MBID != "" {
					mbid = &info.MBID
				}

				var artistMbid *string
				if info.Artist.MBID != "" {
					mbid = &info.Artist.MBID
				}

				var albumTitle *string
				if info.Album.Title != "" {
					albumTitle = &info.Album.Title
				}

				var albumMbid *string
				if info.Album.MBID != "" {
					albumMbid = &info.Album.MBID
				}

				trackInfo = &data.LastfmTrack{
					Mbid:       mbid,
					Title:      info.Title,
					Duration:   &dur,
					ArtistName: info.Artist.Name,
					ArtistMbid: artistMbid,
					AlbumTitle: albumTitle,
					AlbumMbid:  albumMbid,
				}
			}
		}

		var mbid *string
		title := lastfmTitle
		duration := recommendedTrack.Duration.Unwrap()
		artistName := lastfmArtist
		var artistMbid *string
		var albumTitle *string
		var albumMbid *string

		if recommendedTrack.MBID != "" {
			mbid = &recommendedTrack.MBID
		}

		if recommendedTrack.Artist.MBID != "" {
			artistMbid = &recommendedTrack.Artist.MBID
		}

		if trackInfo != nil {
			if trackInfo.Mbid != nil {
				mbid = trackInfo.Mbid
			}

			if trackInfo.Duration != nil {
				duration = *trackInfo.Duration
			}

			if trackInfo.ArtistMbid != nil {
				artistMbid = trackInfo.ArtistMbid
			}

			albumTitle = trackInfo.AlbumTitle
			albumMbid = trackInfo.AlbumMbid
		}

		lastfmTrack := data.LastfmTrack{
			Mbid:       mbid,
			Title:      title,
			Duration:   &duration,
			ArtistName: artistName,
			ArtistMbid: artistMbid,
			AlbumTitle: albumTitle,
			AlbumMbid:  albumMbid,
		}

		s.writeMu.Lock()
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
