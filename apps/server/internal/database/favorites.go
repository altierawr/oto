package database

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/types"
	"github.com/google/uuid"
)

func marshalPayload(value any) (string, error) {
	payload, err := json.Marshal(value)
	if err != nil {
		return "", err
	}

	return string(payload), nil
}

// --- Artists ---

func (db *DB) AddFavoriteArtist(userId uuid.UUID, artist *types.TidalArtist) error {
	if artist == nil {
		return errors.New("artist is nil")
	}

	payload, err := marshalPayload(artist)
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

	upsertArtistQuery := `
		INSERT INTO tidal_artists (id, payload, updated_at)
		VALUES ($1, $2, unixepoch())
		ON CONFLICT(id) DO UPDATE
		SET payload = excluded.payload, updated_at = excluded.updated_at`

	_, err = tx.ExecContext(ctx, upsertArtistQuery, artist.ID, payload)
	if err != nil {
		return err
	}

	addFavoriteQuery := `INSERT OR IGNORE INTO favorite_artists (user_id, artist_id) VALUES ($1, $2)`
	_, err = tx.ExecContext(ctx, addFavoriteQuery, userId, artist.ID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) RemoveFavoriteArtist(userId uuid.UUID, artistId int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	removeFavoriteQuery := `DELETE FROM favorite_artists WHERE user_id = $1 AND artist_id = $2`
	_, err = tx.ExecContext(ctx, removeFavoriteQuery, userId, artistId)
	if err != nil {
		return err
	}

	cleanupArtistQuery := `
		DELETE FROM tidal_artists
		WHERE id = $1
		AND NOT EXISTS (
			SELECT 1
			FROM favorite_artists
			WHERE artist_id = $1
		)`
	_, err = tx.ExecContext(ctx, cleanupArtistQuery, artistId)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) IsFavoriteArtist(userId uuid.UUID, artistId int64) (bool, error) {
	query := `SELECT COUNT(1) FROM favorite_artists WHERE user_id = $1 AND artist_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var count int
	err := db.QueryRowContext(ctx, query, userId, artistId).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (db *DB) GetFavoriteArtists(userId uuid.UUID) ([]types.TidalArtist, error) {
	query := `
		SELECT tidal_artists.payload
		FROM favorite_artists
		INNER JOIN tidal_artists ON tidal_artists.id = favorite_artists.artist_id
		WHERE favorite_artists.user_id = $1
		ORDER BY favorite_artists.created_at DESC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	artists := []types.TidalArtist{}
	for rows.Next() {
		var payload string
		if err := rows.Scan(&payload); err != nil {
			return nil, err
		}

		var artist types.TidalArtist
		if err := json.Unmarshal([]byte(payload), &artist); err != nil {
			return nil, err
		}

		artists = append(artists, artist)
	}

	return artists, rows.Err()
}

// --- Albums ---

func (db *DB) AddFavoriteAlbum(userId uuid.UUID, album *types.TidalAlbum) error {
	if album == nil {
		return errors.New("album is nil")
	}

	payload, err := marshalPayload(album)
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

	upsertAlbumQuery := `
		INSERT INTO tidal_albums (id, payload, updated_at)
		VALUES ($1, $2, unixepoch())
		ON CONFLICT(id) DO UPDATE
		SET payload = excluded.payload, updated_at = excluded.updated_at`

	_, err = tx.ExecContext(ctx, upsertAlbumQuery, album.ID, payload)
	if err != nil {
		return err
	}

	addFavoriteQuery := `INSERT OR IGNORE INTO favorite_albums (user_id, album_id) VALUES ($1, $2)`
	_, err = tx.ExecContext(ctx, addFavoriteQuery, userId, album.ID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) RemoveFavoriteAlbum(userId uuid.UUID, albumId int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	removeFavoriteQuery := `DELETE FROM favorite_albums WHERE user_id = $1 AND album_id = $2`
	_, err = tx.ExecContext(ctx, removeFavoriteQuery, userId, albumId)
	if err != nil {
		return err
	}

	cleanupAlbumQuery := `
		DELETE FROM tidal_albums
		WHERE id = $1
		AND NOT EXISTS (
			SELECT 1
			FROM favorite_albums
			WHERE album_id = $1
		)`
	_, err = tx.ExecContext(ctx, cleanupAlbumQuery, albumId)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) IsFavoriteAlbum(userId uuid.UUID, albumId int64) (bool, error) {
	query := `SELECT COUNT(1) FROM favorite_albums WHERE user_id = $1 AND album_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var count int
	err := db.QueryRowContext(ctx, query, userId, albumId).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (db *DB) GetFavoriteAlbums(userId uuid.UUID) ([]types.TidalAlbum, error) {
	query := `
		SELECT tidal_albums.payload
		FROM favorite_albums
		INNER JOIN tidal_albums ON tidal_albums.id = favorite_albums.album_id
		WHERE favorite_albums.user_id = $1
		ORDER BY favorite_albums.created_at DESC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	albums := []types.TidalAlbum{}
	for rows.Next() {
		var payload string
		if err := rows.Scan(&payload); err != nil {
			return nil, err
		}

		var album types.TidalAlbum
		if err := json.Unmarshal([]byte(payload), &album); err != nil {
			return nil, err
		}

		albums = append(albums, album)
	}

	return albums, rows.Err()
}

// --- Tracks ---

func (db *DB) AddFavoriteTrack(userId uuid.UUID, track *types.TidalSong) error {
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

	upsertTrackQuery := `
		INSERT INTO tidal_tracks (id, payload, updated_at)
		VALUES ($1, $2, unixepoch())
		ON CONFLICT(id) DO UPDATE
		SET payload = excluded.payload, updated_at = excluded.updated_at`

	_, err = tx.ExecContext(ctx, upsertTrackQuery, track.ID, payload)
	if err != nil {
		return err
	}

	addFavoriteQuery := `INSERT OR IGNORE INTO favorite_tracks (user_id, track_id) VALUES ($1, $2)`
	_, err = tx.ExecContext(ctx, addFavoriteQuery, userId, track.ID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) RemoveFavoriteTrack(userId uuid.UUID, trackId int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	removeFavoriteQuery := `DELETE FROM favorite_tracks WHERE user_id = $1 AND track_id = $2`
	_, err = tx.ExecContext(ctx, removeFavoriteQuery, userId, trackId)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) IsFavoriteTrack(userId uuid.UUID, trackId int64) (bool, error) {
	query := `SELECT COUNT(1) FROM favorite_tracks WHERE user_id = $1 AND track_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var count int
	err := db.QueryRowContext(ctx, query, userId, trackId).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (db *DB) GetFavoriteTracks(userId uuid.UUID) ([]types.TidalSong, error) {
	query := `
		SELECT tidal_tracks.payload
		FROM favorite_tracks
		INNER JOIN tidal_tracks ON tidal_tracks.id = favorite_tracks.track_id
		WHERE favorite_tracks.user_id = $1
		ORDER BY favorite_tracks.created_at DESC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tracks := []types.TidalSong{}
	for rows.Next() {
		var payload string
		if err := rows.Scan(&payload); err != nil {
			return nil, err
		}

		var track types.TidalSong
		if err := json.Unmarshal([]byte(payload), &track); err != nil {
			return nil, err
		}

		tracks = append(tracks, track)
	}

	return tracks, rows.Err()
}
