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

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	err = db.InsertTidalArtist(artist, tx)
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
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT tidal_artists.*
		FROM favorite_artists
		INNER JOIN tidal_artists ON tidal_artists.id = favorite_artists.artist_id
		WHERE favorite_artists.user_id = $1
		ORDER BY favorite_artists.created_at DESC`

	artists := []types.TidalArtist{}
	err := db.SelectContext(ctx, &artists, query, userId)
	if err != nil {
		return nil, err
	}

	return artists, nil
}

// --- Albums ---

func (db *DB) AddFavoriteAlbum(userId uuid.UUID, album *types.TidalAlbum) error {
	if album == nil {
		return errors.New("album is nil")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	err = db.InsertTidalAlbum(album, tx)
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
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT
			tidal_albums.id,
			tidal_albums.cover,
			tidal_albums.duration,
			tidal_albums.explicit,
			tidal_albums.number_of_tracks,
			tidal_albums.number_of_volumes,
			tidal_albums.release_date,
			tidal_albums.title,
			tidal_albums.type,
			tidal_albums.upc,
			tidal_albums.vibrant_color,
			tidal_albums.video_cover,
			tidal_artists.id,
			tidal_artists.name,
			tidal_artists.picture,
			tidal_artists.selected_album_cover_fallback
		FROM favorite_albums
		INNER JOIN tidal_albums ON tidal_albums.id = favorite_albums.album_id
		INNER JOIN tidal_artists ON tidal_albums.artist_id = tidal_artists.id
		WHERE favorite_albums.user_id = $1
		ORDER BY favorite_albums.created_at DESC`

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	albums := []types.TidalAlbum{}
	for rows.Next() {
		album := types.TidalAlbum{}
		artist := types.TidalArtist{}
		err = rows.Scan(
			&album.ID,
			&album.Cover,
			&album.Duration,
			&album.Explicit,
			&album.NumberOfTracks,
			&album.NumberOfVolumes,
			&album.ReleaseDate,
			&album.Title,
			&album.Type,
			&album.UPC,
			&album.VibrantColor,
			&album.VideoCover,
			&artist.ID,
			&artist.Name,
			&artist.Picture,
			&artist.SelectedAlbumCoverFallback,
		)
		if err != nil {
			return nil, err
		}

		album.Artists = []types.TidalArtist{artist}
		albums = append(albums, album)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return albums, nil
}

// --- Tracks ---

func (db *DB) AddFavoriteTrack(userId uuid.UUID, track *types.TidalSong) error {
	if track == nil {
		return errors.New("track is nil")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	err = db.InsertTidalTrack(track, tx)
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
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT
			tt.id,
			tt.bpm,
			tt.duration,
			tt.explicit,
			tt.isrc,
			tt.stream_start_date,
			tt.title,
			tt.track_number,
			tt.volume_number,
			tidal_artists.id,
			tidal_artists.name,
			tidal_artists.picture,
			tidal_artists.selected_album_cover_fallback,
			tidal_albums.id,
			tidal_albums.cover,
			tidal_albums.duration,
			tidal_albums.explicit,
			tidal_albums.number_of_tracks,
			tidal_albums.number_of_volumes,
			tidal_albums.release_date,
			tidal_albums.title,
			tidal_albums.type,
			tidal_albums.upc,
			tidal_albums.vibrant_color,
			tidal_albums.video_cover
		FROM favorite_tracks
		INNER JOIN tidal_tracks tt ON tt.id = favorite_tracks.track_id
		INNER JOIN tidal_artists ON tt.artist_id = tidal_artists.id
		INNER JOIN tidal_albums ON tt.album_id = tidal_albums.id
		WHERE favorite_tracks.user_id = $1
		ORDER BY favorite_tracks.created_at DESC`

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tracks := []types.TidalSong{}
	for rows.Next() {
		track := types.TidalSong{}
		artist := types.TidalArtist{}
		album := types.TidalAlbum{}
		err = rows.Scan(
			&track.ID,
			&track.Bpm,
			&track.Duration,
			&track.Explicit,
			&track.ISRC,
			&track.StreamStartDate,
			&track.Title,
			&track.TrackNumber,
			&track.VolumeNumber,
			&artist.ID,
			&artist.Name,
			&artist.Picture,
			&artist.SelectedAlbumCoverFallback,
			&album.ID,
			&album.Cover,
			&album.Duration,
			&album.Explicit,
			&album.NumberOfTracks,
			&album.NumberOfVolumes,
			&album.ReleaseDate,
			&album.Title,
			&album.Type,
			&album.UPC,
			&album.VibrantColor,
			&album.VideoCover,
		)
		if err != nil {
			return nil, err
		}

		track.Artists = []types.TidalArtist{artist}
		track.Album = &album
		tracks = append(tracks, track)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tracks, nil
}
