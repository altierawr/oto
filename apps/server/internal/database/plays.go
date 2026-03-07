package database

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

func (db *DB) AddTrackPlay(trackId int64, userId uuid.UUID, isAutoplay bool, startAt int64, endAt int64) error {
	_, err := db.GetTidalTrack(trackId)
	if err != nil {
		return nil
	}

	query := `
		INSERT INTO plays (track_id, user_id, is_autoplay, start_at, end_at)
		VALUES ($1, $2, $3, $4, $5)`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{trackId, userId, isAutoplay, startAt, endAt}

	result, err := db.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("no rows affected")
	}

	return nil
}
