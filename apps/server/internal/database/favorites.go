package database

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// --- Artists ---

func (db *DB) AddFavoriteArtist(userId uuid.UUID, artistId int64) error {
	query := `INSERT OR IGNORE INTO favorite_artists (user_id, artist_id) VALUES ($1, $2)`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId, artistId)
	return err
}

func (db *DB) RemoveFavoriteArtist(userId uuid.UUID, artistId int64) error {
	query := `DELETE FROM favorite_artists WHERE user_id = $1 AND artist_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId, artistId)
	return err
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

func (db *DB) GetFavoriteArtistIDs(userId uuid.UUID) ([]int64, error) {
	query := `SELECT artist_id FROM favorite_artists WHERE user_id = $1 ORDER BY created_at DESC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	return ids, rows.Err()
}

// --- Albums ---

func (db *DB) AddFavoriteAlbum(userId uuid.UUID, albumId int64) error {
	query := `INSERT OR IGNORE INTO favorite_albums (user_id, album_id) VALUES ($1, $2)`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId, albumId)
	return err
}

func (db *DB) RemoveFavoriteAlbum(userId uuid.UUID, albumId int64) error {
	query := `DELETE FROM favorite_albums WHERE user_id = $1 AND album_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId, albumId)
	return err
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

func (db *DB) GetFavoriteAlbumIDs(userId uuid.UUID) ([]int64, error) {
	query := `SELECT album_id FROM favorite_albums WHERE user_id = $1 ORDER BY created_at DESC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	return ids, rows.Err()
}

// --- Tracks ---

func (db *DB) AddFavoriteTrack(userId uuid.UUID, trackId int64) error {
	query := `INSERT OR IGNORE INTO favorite_tracks (user_id, track_id) VALUES ($1, $2)`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId, trackId)
	return err
}

func (db *DB) RemoveFavoriteTrack(userId uuid.UUID, trackId int64) error {
	query := `DELETE FROM favorite_tracks WHERE user_id = $1 AND track_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId, trackId)
	return err
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

func (db *DB) GetFavoriteTrackIDs(userId uuid.UUID) ([]int64, error) {
	query := `SELECT track_id FROM favorite_tracks WHERE user_id = $1 ORDER BY created_at DESC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	return ids, rows.Err()
}
