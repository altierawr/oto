package tidal

import (
	"context"
	"log/slog"
	"time"

	"github.com/altierawr/oto/internal/database"
	"golang.org/x/time/rate"
)

type Service struct {
	db     *database.DB
	logger *slog.Logger

	limiter *rate.Limiter
	stop    chan bool
	done    chan bool
}

func New(db *database.DB, logger *slog.Logger) *Service {
	return &Service{
		db:      db,
		logger:  logger,
		limiter: rate.NewLimiter(rate.Every(500*time.Millisecond), 1),
		stop:    make(chan bool),
		done:    make(chan bool),
	}
}

func (s *Service) RunBackground() {
	defer close(s.done)

	ticker := time.NewTicker(60 * time.Minute)
	defer ticker.Stop()

	s.fetchMissingTidalEntries()

	for {
		select {
		case <-s.stop:
			return
		case <-ticker.C:
			s.fetchMissingTidalEntries()
		}
	}
}

func (s *Service) Stop() {
	select {
	case <-s.stop:
	default:
		close(s.stop)
	}
	<-s.done
}

func (s *Service) fetchMissingTidalEntries() {
	s.logger.Info("fetching missing tidal entries")

	ctx := context.Background()
	s.fetchMissingTidalArtists(ctx)
	s.fetchMissingTidalAlbums(ctx)
}

func (s *Service) fetchMissingTidalArtists(ctx context.Context) {
	missingArtistIds, err := s.db.GetMissingTidalArtistIds()
	if err != nil {
		s.logger.Error("couldn't get missing tidal artist ids",
			"error", err.Error())
		return
	}

	for _, id := range missingArtistIds {
		select {
		case <-s.stop:
			return
		default:
		}

		if err := s.limiter.Wait(ctx); err != nil {
			s.logger.Error("limiter fail",
				"error", err.Error())
			return
		}

		artist, err := GetArtistBasicInfo(id)
		if err != nil {
			s.logger.Error("couldn't get artist basic info",
				"error", err.Error(),
				"id", id)
			continue
		}

		err = s.db.InsertTidalArtist(artist, nil)
		if err != nil {
			s.logger.Error("couldn't insert tidal artist",
				"error", err.Error(),
				"id", id)
			continue
		}

		s.logger.Info("fetched missing tidal artist",
			"id", artist.ID,
			"name", artist.Name)
	}
}

func (s *Service) fetchMissingTidalAlbums(ctx context.Context) {
	missingAlbumIds, err := s.db.GetMissingTidalAlbumIds()
	if err != nil {
		s.logger.Error("couldn't get missing tidal album ids",
			"error", err.Error())
		return
	}

	for _, id := range missingAlbumIds {
		select {
		case <-s.stop:
			return
		default:
		}

		if err := s.limiter.Wait(ctx); err != nil {
			s.logger.Error("limiter fail",
				"error", err.Error())
			return
		}

		album, err := GetAlbum(id)
		if err != nil {
			s.logger.Error("couldn't get tidal album",
				"error", err.Error(),
				"id", id)
			continue
		}

		err = s.db.InsertTidalAlbum(album, nil)
		if err != nil {
			s.logger.Error("couldn't insert tidal album",
				"error", err.Error(),
				"id", id)
			continue
		}

		s.logger.Info("fetched missing tidal album",
			"id", album.ID,
			"title", album.Title)
	}
}
