package sessions

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"github.com/altierawr/oto/internal/database"
	"github.com/google/uuid"
)

type Stream struct {
	IsLoading  bool
	NrSegments int
	Ffmpeg     *exec.Cmd
	TrackId    int64
	SeekOffset float64
}

var SessionStreams map[string]map[string]*Stream = make(map[string]map[string]*Stream)
var SessionStreamsMu sync.RWMutex

func GetSessionPath(sessionId *uuid.UUID) string {
	return filepath.Join(os.TempDir(), "oto", fmt.Sprintf("session-%s", sessionId.String()))
}

func GetStreamPath(sessionId *uuid.UUID, streamId string) string {
	return filepath.Join(GetSessionPath(sessionId), fmt.Sprintf("stream-%s", streamId))
}

type Service struct {
	db     *database.DB
	logger *slog.Logger
	stop   chan bool
	done   chan bool
}

func New(db *database.DB, logger *slog.Logger) *Service {
	return &Service{
		db:     db,
		logger: logger,
		stop:   make(chan bool),
		done:   make(chan bool),
	}
}

func (s *Service) RunBackground() {
	defer close(s.done)

	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-s.stop:
			return
		case <-ticker.C:
			s.cleanupExpiredSessions()
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

func (s *Service) cleanupExpiredSessions() {
	sessions, err := s.db.DeleteExpiredSessions()
	if err != nil {
		s.logger.Error("couldn't delete expired sessions",
			"error", err.Error())
	}

	if sessions != nil {
		for _, session := range *sessions {
			sessionPath := GetSessionPath(&session.ID)
			s.logger.Info("deleting expired session",
				"id", session.ID,
				"path", sessionPath)

			err = os.RemoveAll(sessionPath)
			if err != nil {
				s.logger.Error("couldn't delete session directory",
					"error", err.Error(),
					"id", session.ID,
					"path", sessionPath)
			}

			SessionStreamsMu.Lock()
			delete(SessionStreams, session.ID.String())
			SessionStreamsMu.Unlock()
		}
	}
}
