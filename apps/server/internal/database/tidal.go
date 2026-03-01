package database

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/altierawr/oto/internal/types"
	"github.com/jmoiron/sqlx"
)

func (db *DB) InsertTidalTracks(tracks []types.TidalSong, tx *sqlx.Tx) error {
	for _, track := range tracks {
		err := db.InsertTidalTrack(&track, tx)
		if err != nil {
			return err
		}
	}

	return nil
}

func (db *DB) InsertTidalTrack(track *types.TidalSong, tx *sqlx.Tx) error {
	if track == nil {
		return errors.New("track is nil")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	artistName := ""
	if len(track.Artists) > 0 {
		artistName = track.Artists[0].Name
	}

	query := `
		INSERT INTO tidal_tracks (id, payload, artist_name, title, updated_at)
		VALUES ($1, $2, $3, $4, unixepoch())
		ON CONFLICT(id) DO UPDATE
		SET payload = excluded.payload,
				artist_name = excluded.artist_name,
				title = excluded.title,
				updated_at = unixepoch()`

	payload, err := marshalPayload(track)
	if err != nil {
		return err
	}

	if tx != nil {
		_, err = tx.ExecContext(ctx, query, track.ID, payload, artistName, track.Title)
	} else {
		_, err = db.ExecContext(ctx, query, track.ID, payload, artistName, track.Title)
	}

	if err != nil {
		return err
	}

	if db.onTidalTrackUpsert != nil {
		db.onTidalTrackUpsert(int64(track.ID))
	}

	return nil
}

func (db *DB) GetTidalTrack(id int64) (*types.TidalSong, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT payload
		FROM tidal_tracks
		WHERE id = $1`

	var payload string

	err := db.QueryRowContext(ctx, query, id).Scan(&payload)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	track, err := unmarshalTrackPayload(payload)
	if err != nil {
		return nil, err
	}

	return &track, err
}

func (db *DB) GetTidalTrackByArtistAndTitle(artistName string, title string) (*types.TidalSong, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT payload
		FROM tidal_tracks
		WHERE LOWER(TRIM(artist_name)) = LOWER(TRIM($1))
		AND LOWER(TRIM(title)) = LOWER(TRIM($2))
		ORDER BY updated_at DESC
		LIMIT 1`

	var payload string
	err := db.QueryRowContext(ctx, query, strings.TrimSpace(artistName), strings.TrimSpace(title)).Scan(&payload)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	track, err := unmarshalTrackPayload(payload)
	if err != nil {
		return nil, err
	}

	return &track, nil
}
