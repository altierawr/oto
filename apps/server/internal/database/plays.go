package database

import (
	"context"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/types"
	"github.com/google/uuid"
)

func (db *DB) AddTrackPlay(trackId int64, userId uuid.UUID, isAutoplay bool, startAt int64, endAt int64) error {
	_, err := db.GetTidalTrack(trackId)
	if err != nil {
		return err
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

func (db *DB) GetUserTopPlayedTracks(userId uuid.UUID) (*[]types.TidalSong, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		WITH ranked AS (
	    SELECT
	      plays.track_id,
	      COUNT(*) AS play_count,
	      MAX(plays.end_at) AS last_played_at,
	      SUM(
	        1.0 / (
						1.0 + ((unixepoch() - plays.end_at) / 86400.0) / :decay_days
					)
	      ) AS weighted_score
	    FROM plays
	    WHERE plays.user_id = :user_id
	    GROUP BY plays.track_id
	  )
	  SELECT tidal_tracks.payload
	  FROM ranked
	  JOIN tidal_tracks ON tidal_tracks.id = ranked.track_id
	  ORDER BY ranked.weighted_score DESC, ranked.play_count DESC, ranked.last_played_at DESC
	  LIMIT :limit`

	rows, err := db.NamedQueryContext(ctx, query, map[string]any{
		"decay_days": 7.0,
		"user_id":    userId.String(),
		"limit":      50,
	})
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tracks := []types.TidalSong{}
	for rows.Next() {
		var payload string

		if err = rows.Scan(&payload); err != nil {
			return nil, err
		}

		track, err := unmarshalTrackPayload(payload)
		if err != nil {
			return nil, err
		}

		tracks = append(tracks, track)
	}

	return &tracks, rows.Err()
}
