package database

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/types"
	"github.com/google/uuid"
)

var sessionExpiryTime time.Duration = 24 * time.Hour

func (db *DB) CreateSession(userId uuid.UUID) (*data.Session, error) {
	query := `
		INSERT INTO sessions (id, user_id, expiry)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at, expiry`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{uuid.New(), userId, data.UnixTime{Time: time.Now().Add(sessionExpiryTime)}}

	session := data.Session{}
	err := db.QueryRowContext(ctx, query, args...).Scan(
		&session.ID,
		&session.CreatedAt,
		&session.UpdatedAt,
		&session.Expiry,
	)
	if err != nil {
		return nil, err
	}

	return &session, nil
}

func (db *DB) AddSessionTrack(userId uuid.UUID, sessionId uuid.UUID, track types.TidalSong, position int64, isAutoplay bool) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	sessionQuery := `
		SELECT COUNT(1)
		FROM sessions
		WHERE user_id = $1 AND id = $2`

	var count int
	err = tx.QueryRowContext(ctx, sessionQuery, userId, sessionId).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return ErrRecordNotFound
	}

	// We have a unique constraint on (session_id, position) so first move them into negative to avoid errors
	moveNextTracksP1Query := `
		UPDATE session_tracks
		SET position = -position - 1
		WHERE session_id = $1 AND position >= $2`

	result, err := tx.ExecContext(ctx, moveNextTracksP1Query, sessionId, position)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected > 0 {
		moveNextTracksP2Query := `
				UPDATE session_tracks
				SET position = -position
				WHERE session_id = $1 AND position < 0`

		result, err = tx.ExecContext(ctx, moveNextTracksP2Query, sessionId)
		if err != nil {
			return err
		}

		rowsAffected, err = result.RowsAffected()
		if err != nil {
			return err
		}

		// there should be rows that were updated here
		if rowsAffected == 0 {
			db.logger.Error(
				"no rows were affected in move next track p2 query",
				"userId", userId,
				"sessionId", sessionId,
				"trackId", track.ID,
				"position", position,
			)
			return errors.New("something went wrong when updating session track positions")
		}
	}

	insertTrackQuery := `
		INSERT INTO session_tracks (session_id, track_id, position, is_autoplay)
		VALUES ($1, $2, $3, $4)`

	_, err = tx.ExecContext(ctx, insertTrackQuery, sessionId, track.ID, position, isAutoplay)
	if err != nil {
		return err
	}

	updateSessionQuery := `UPDATE sessions SET updated_at = unixepoch() WHERE id = $1`
	_, err = tx.ExecContext(ctx, updateSessionQuery, sessionId)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) RemoveSessionTrack(userId uuid.UUID, sessionId uuid.UUID, position int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	sessionQuery := `
		SELECT COUNT(1)
		FROM sessions
		WHERE user_id = $1 AND id = $2`

	var count int
	err = tx.QueryRowContext(ctx, sessionQuery, userId, sessionId).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return ErrRecordNotFound
	}

	removeTrackQuery := `
		DELETE FROM session_tracks
		WHERE session_id = $1 AND position = $2`

	result, err := tx.ExecContext(ctx, removeTrackQuery, sessionId, position)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrRecordNotFound
	}

	// We have a unique constraint on (session_id, position) so first move them into negative to avoid errors
	moveNextTracksP1Query := `
		UPDATE session_tracks
		SET position = -position
		WHERE session_id = $1 AND position > $2`

	result, err = tx.ExecContext(ctx, moveNextTracksP1Query, sessionId, position)
	if err != nil {
		return err
	}

	rowsAffected, err = result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected > 0 {
		moveNextTracksP2Query := `
			UPDATE session_tracks
			SET position = -position - 1
			WHERE session_id = $1 AND position < 0`

		result, err = tx.ExecContext(ctx, moveNextTracksP2Query, sessionId)
		if err != nil {
			return err
		}

		rowsAffected, err = result.RowsAffected()
		if err != nil {
			return err
		}

		// there should be rows that were updated here
		if rowsAffected == 0 {
			db.logger.Error(
				"no rows were affected in move next track p2 query",
				"userId", userId,
				"sessionId", sessionId,
				"position", position,
			)
			return errors.New("something went wrong when updating session track positions")
		}
	}

	updateSessionQuery := `UPDATE sessions SET updated_at = unixepoch() WHERE id = $1`
	_, err = tx.ExecContext(ctx, updateSessionQuery, sessionId)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) SetSessionTracks(userId uuid.UUID, sessionId uuid.UUID, tracks []*types.TidalSong) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	sessionQuery := `
		SELECT COUNT(1)
		FROM sessions
		WHERE user_id = $1 AND id = $2`

	var count int
	err := db.QueryRowContext(ctx, sessionQuery, userId, sessionId).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return ErrRecordNotFound
	}

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	deleteTracksQuery := `
		DELETE FROM session_tracks
		WHERE session_id = $1`

	_, err = tx.ExecContext(ctx, deleteTracksQuery, sessionId)
	if err != nil {
		return err
	}

	for idx, track := range tracks {
		err = db.InsertTidalTrack(track, tx)
		if err != nil {
			return err
		}

		insertSessionTrackQuery := `
			INSERT INTO session_tracks (session_id, track_id, position)
			VALUES ($1, $2, $3)`

		_, err = tx.ExecContext(ctx, insertSessionTrackQuery, sessionId, track.ID, idx)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (db *DB) GetSession(userId uuid.UUID, sessionId uuid.UUID) (*data.Session, error) {
	baseQuery := `
		SELECT id, created_at, updated_at, expiry
		FROM sessions
		WHERE user_id = $1
		AND id = $2
		AND expiry > $3`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{userId, sessionId, time.Now().Unix()}

	session := data.Session{
		Tracks: []data.SessionTrack{},
	}

	err := db.QueryRowContext(ctx, baseQuery, args...).
		Scan(
			&session.ID,
			&session.CreatedAt,
			&session.UpdatedAt,
			&session.Expiry,
		)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecordNotFound
		}

		return nil, err
	}

	tracksQuery := `
		SELECT tidal_tracks.payload, session_tracks.is_autoplay
		FROM session_tracks
		INNER JOIN tidal_tracks ON tidal_tracks.id = session_tracks.track_id
		WHERE session_tracks.session_id = $1
		ORDER BY session_tracks.position ASC`

	rows, err := db.QueryContext(ctx, tracksQuery, sessionId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var payload string
		var isAutoplay bool

		if err := rows.Scan(&payload, &isAutoplay); err != nil {
			return nil, err
		}

		track, err := unmarshalTrackPayload(payload)
		if err != nil {
			return nil, err
		}

		session.Tracks = append(session.Tracks, data.SessionTrack{
			TidalSong:  track,
			IsAutoplay: isAutoplay,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return &session, nil
}

func (db *DB) DeleteExpiredSessions() (*[]data.Session, error) {
	query := `
		DELETE FROM sessions
		WHERE expiry < $1
		RETURNING id, created_at, updated_at, expiry`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, time.Now().Unix())
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessions := []data.Session{}
	for rows.Next() {
		session := data.Session{}

		err := rows.Scan(
			&session.ID,
			&session.CreatedAt,
			&session.UpdatedAt,
			&session.Expiry,
		)
		if err != nil {
			return nil, err
		}

		sessions = append(sessions, session)
	}

	return &sessions, rows.Err()
}

func (db *DB) RefreshSession(userId uuid.UUID, sessionId uuid.UUID) (*data.Session, error) {
	query := `
		UPDATE sessions
		SET updated_at = unixepoch(),
				expiry = $1
		WHERE user_id = $2
		AND id = $3
		AND expiry > $4
		RETURNING id, created_at, updated_at, expiry`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{data.UnixTime{Time: time.Now().Add(sessionExpiryTime)}, userId, sessionId, time.Now().Unix()}

	session := data.Session{}
	err := db.QueryRowContext(ctx, query, args...).Scan(
		&session.ID,
		&session.CreatedAt,
		&session.UpdatedAt,
		&session.Expiry,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &session, nil
}

func (db *DB) DeleteSession(userId string, sessionId uuid.UUID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var count int
	checkSessionQuery := `SELECT COUNT(1) FROM sessions WHERE user_id = $1 AND id = $2`
	err = tx.QueryRowContext(ctx, checkSessionQuery, userId, sessionId).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return ErrRecordNotFound
	}

	deleteSessionQuery := `DELETE FROM sessions WHERE user_id = $1 AND id = $2`
	_, err = tx.ExecContext(ctx, deleteSessionQuery, userId, sessionId)
	if err != nil {
		return err
	}

	return tx.Commit()
}
