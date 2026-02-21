package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/types"
	"github.com/google/uuid"
)

var ErrDuplicatePlaylistTrack = errors.New("duplicate playlist track")

type UserPlaylistSummary struct {
	ID             int64    `json:"id"`
	Name           string   `json:"name"`
	NumberOfTracks int      `json:"numberOfTracks"`
	Duration       int      `json:"duration"`
	CoverURLs      []string `json:"coverUrls"`
}

type UserPlaylist struct {
	ID             int64             `json:"id"`
	Name           string            `json:"name"`
	NumberOfTracks int               `json:"numberOfTracks"`
	Duration       int               `json:"duration"`
	CoverURLs      []string          `json:"coverUrls"`
	Tracks         []types.TidalSong `json:"tracks"`
}

type TrackPlaylist struct {
	ID        int64    `json:"id"`
	Name      string   `json:"name"`
	CoverURLs []string `json:"coverUrls"`
}

func unmarshalTrackPayload(payload string) (types.TidalSong, error) {
	var track types.TidalSong
	err := json.Unmarshal([]byte(payload), &track)
	if err != nil {
		return types.TidalSong{}, err
	}

	return track, nil
}

func appendUniqueCoverURL(coverURLs []string, seen map[string]struct{}, cover string) []string {
	if len(coverURLs) >= 4 || cover == "" {
		return coverURLs
	}

	if _, exists := seen[cover]; exists {
		return coverURLs
	}

	seen[cover] = struct{}{}

	return append(coverURLs, cover)
}

func (db *DB) CreatePlaylist(userID uuid.UUID, name string) (*UserPlaylistSummary, error) {
	query := `INSERT INTO playlists (user_id, name, updated_at) VALUES ($1, $2, unixepoch())`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := db.ExecContext(ctx, query, userID, name)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &UserPlaylistSummary{
		ID:             id,
		Name:           name,
		NumberOfTracks: 0,
		Duration:       0,
		CoverURLs:      []string{},
	}, nil
}

func (db *DB) RenamePlaylist(userID uuid.UUID, playlistID int64, name string) (*UserPlaylistSummary, error) {
	query := `
		UPDATE playlists
		SET name = $1, updated_at = unixepoch()
		WHERE id = $2 AND user_id = $3`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := db.ExecContext(ctx, query, name, playlistID, userID)
	if err != nil {
		return nil, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}

	if rowsAffected == 0 {
		return nil, ErrRecordNotFound
	}

	playlist, err := db.GetUserPlaylist(userID, playlistID)
	if err != nil {
		return nil, err
	}

	return &UserPlaylistSummary{
		ID:             playlist.ID,
		Name:           playlist.Name,
		NumberOfTracks: playlist.NumberOfTracks,
		Duration:       playlist.Duration,
		CoverURLs:      playlist.CoverURLs,
	}, nil
}

func (db *DB) GetUserPlaylists(userID uuid.UUID) ([]UserPlaylistSummary, error) {
	query := `
		SELECT playlists.id, playlists.name, tidal_tracks.payload
		FROM playlists
		LEFT JOIN playlist_tracks ON playlist_tracks.playlist_id = playlists.id
		LEFT JOIN tidal_tracks ON tidal_tracks.id = playlist_tracks.track_id
		WHERE playlists.user_id = $1
		ORDER BY playlists.created_at DESC, playlist_tracks.created_at ASC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	playlists := []UserPlaylistSummary{}
	indexByID := map[int64]int{}
	seenCoverURLsByPlaylistID := map[int64]map[string]struct{}{}

	for rows.Next() {
		var id int64
		var name string
		var payload sql.NullString

		if err := rows.Scan(&id, &name, &payload); err != nil {
			return nil, err
		}

		index, exists := indexByID[id]
		if !exists {
			playlists = append(playlists, UserPlaylistSummary{
				ID:             id,
				Name:           name,
				NumberOfTracks: 0,
				Duration:       0,
				CoverURLs:      []string{},
			})
			index = len(playlists) - 1
			indexByID[id] = index
			seenCoverURLsByPlaylistID[id] = map[string]struct{}{}
		}

		if payload.Valid {
			track, err := unmarshalTrackPayload(payload.String)
			if err != nil {
				return nil, err
			}

			playlists[index].NumberOfTracks++
			playlists[index].Duration += track.Duration
			playlists[index].CoverURLs = appendUniqueCoverURL(
				playlists[index].CoverURLs,
				seenCoverURLsByPlaylistID[id],
				track.Album.Cover,
			)
		}
	}

	return playlists, rows.Err()
}

func (db *DB) GetUserPlaylist(userID uuid.UUID, playlistID int64) (*UserPlaylist, error) {
	baseQuery := `SELECT id, name FROM playlists WHERE user_id = $1 AND id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	playlist := &UserPlaylist{
		CoverURLs: []string{},
		Tracks:    []types.TidalSong{},
	}

	err := db.QueryRowContext(ctx, baseQuery, userID, playlistID).Scan(&playlist.ID, &playlist.Name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRecordNotFound
		}

		return nil, err
	}

	tracksQuery := `
		SELECT tidal_tracks.payload
		FROM playlist_tracks
		INNER JOIN tidal_tracks ON tidal_tracks.id = playlist_tracks.track_id
		WHERE playlist_tracks.playlist_id = $1
		ORDER BY playlist_tracks.created_at ASC`

	rows, err := db.QueryContext(ctx, tracksQuery, playlistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	seenCoverURLs := map[string]struct{}{}

	for rows.Next() {
		var payload string

		if err := rows.Scan(&payload); err != nil {
			return nil, err
		}

		track, err := unmarshalTrackPayload(payload)
		if err != nil {
			return nil, err
		}

		playlist.Tracks = append(playlist.Tracks, track)
		playlist.NumberOfTracks++
		playlist.Duration += track.Duration
		playlist.CoverURLs = appendUniqueCoverURL(playlist.CoverURLs, seenCoverURLs, track.Album.Cover)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return playlist, nil
}

func (db *DB) DeletePlaylist(userID uuid.UUID, playlistID int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var count int
	checkPlaylistQuery := `SELECT COUNT(1) FROM playlists WHERE user_id = $1 AND id = $2`
	err = tx.QueryRowContext(ctx, checkPlaylistQuery, userID, playlistID).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return ErrRecordNotFound
	}

	trackIDs := map[int64]struct{}{}
	getTracksQuery := `SELECT track_id FROM playlist_tracks WHERE playlist_id = $1`
	rows, err := tx.QueryContext(ctx, getTracksQuery, playlistID)
	if err != nil {
		return err
	}

	for rows.Next() {
		var trackID int64
		if err := rows.Scan(&trackID); err != nil {
			rows.Close()
			return err
		}
		trackIDs[trackID] = struct{}{}
	}

	if err := rows.Err(); err != nil {
		rows.Close()
		return err
	}
	rows.Close()

	deletePlaylistQuery := `DELETE FROM playlists WHERE user_id = $1 AND id = $2`
	_, err = tx.ExecContext(ctx, deletePlaylistQuery, userID, playlistID)
	if err != nil {
		return err
	}

	for trackID := range trackIDs {
		if err := tryDeleteTidalTrackIfUnreferenced(ctx, tx, trackID); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (db *DB) AddTrackToPlaylist(userID uuid.UUID, playlistID int64, track *types.TidalSong) error {
	if track == nil {
		return errors.New("track is nil")
	}

	payload, err := marshalPayload(track)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var count int
	checkPlaylistQuery := `SELECT COUNT(1) FROM playlists WHERE user_id = $1 AND id = $2`
	err = tx.QueryRowContext(ctx, checkPlaylistQuery, userID, playlistID).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return ErrRecordNotFound
	}

	upsertTrackQuery := `
		INSERT INTO tidal_tracks (id, payload, updated_at)
		VALUES ($1, $2, unixepoch())
		ON CONFLICT(id) DO UPDATE
		SET payload = excluded.payload, updated_at = excluded.updated_at`
	_, err = tx.ExecContext(ctx, upsertTrackQuery, track.ID, payload)
	if err != nil {
		return err
	}

	addPlaylistTrackQuery := `INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id) VALUES ($1, $2)`
	result, err := tx.ExecContext(ctx, addPlaylistTrackQuery, playlistID, track.ID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrDuplicatePlaylistTrack
	}

	updatePlaylistQuery := `UPDATE playlists SET updated_at = unixepoch() WHERE id = $1`
	_, err = tx.ExecContext(ctx, updatePlaylistQuery, playlistID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) RemoveTrackFromPlaylist(userID uuid.UUID, playlistID int64, trackID int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var count int
	checkPlaylistQuery := `SELECT COUNT(1) FROM playlists WHERE user_id = $1 AND id = $2`
	err = tx.QueryRowContext(ctx, checkPlaylistQuery, userID, playlistID).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return ErrRecordNotFound
	}

	deletePlaylistTrackQuery := `DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2`
	result, err := tx.ExecContext(ctx, deletePlaylistTrackQuery, playlistID, trackID)
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

	updatePlaylistQuery := `UPDATE playlists SET updated_at = unixepoch() WHERE id = $1`
	_, err = tx.ExecContext(ctx, updatePlaylistQuery, playlistID)
	if err != nil {
		return err
	}

	if err := tryDeleteTidalTrackIfUnreferenced(ctx, tx, trackID); err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) GetTrackPlaylists(userID uuid.UUID, trackID int64) ([]TrackPlaylist, error) {
	query := `
		SELECT playlists.id, playlists.name, tidal_tracks.payload
		FROM playlists
		LEFT JOIN playlist_tracks ON playlist_tracks.playlist_id = playlists.id
		LEFT JOIN tidal_tracks ON tidal_tracks.id = playlist_tracks.track_id
		WHERE playlists.user_id = $1
		AND EXISTS (
			SELECT 1
			FROM playlist_tracks AS matching_tracks
			WHERE matching_tracks.playlist_id = playlists.id
			AND matching_tracks.track_id = $2
		)
		ORDER BY playlists.created_at DESC, playlist_tracks.created_at ASC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userID, trackID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	playlists := []TrackPlaylist{}
	indexByID := map[int64]int{}
	seenCoverURLsByPlaylistID := map[int64]map[string]struct{}{}

	for rows.Next() {
		var id int64
		var name string
		var payload sql.NullString

		if err := rows.Scan(&id, &name, &payload); err != nil {
			return nil, err
		}

		index, exists := indexByID[id]
		if !exists {
			playlists = append(playlists, TrackPlaylist{
				ID:        id,
				Name:      name,
				CoverURLs: []string{},
			})
			index = len(playlists) - 1
			indexByID[id] = index
			seenCoverURLsByPlaylistID[id] = map[string]struct{}{}
		}

		if payload.Valid {
			track, err := unmarshalTrackPayload(payload.String)
			if err != nil {
				return nil, err
			}

			playlists[index].CoverURLs = appendUniqueCoverURL(
				playlists[index].CoverURLs,
				seenCoverURLsByPlaylistID[id],
				track.Album.Cover,
			)
		}
	}

	return playlists, rows.Err()
}

func (db *DB) IsTrackInPlaylist(userID uuid.UUID, playlistID int64, trackID int64) (bool, error) {
	checkPlaylistQuery := `SELECT COUNT(1) FROM playlists WHERE user_id = $1 AND id = $2`
	countTrackQuery := `SELECT COUNT(1) FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var count int
	err := db.QueryRowContext(ctx, checkPlaylistQuery, userID, playlistID).Scan(&count)
	if err != nil {
		return false, err
	}

	if count == 0 {
		return false, ErrRecordNotFound
	}

	err = db.QueryRowContext(ctx, countTrackQuery, playlistID, trackID).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}
