package database

import (
	"context"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/types"
	"github.com/google/uuid"
)

func (db *DB) AddUserRecommendedArtist(userId uuid.UUID, artist *types.TidalArtist) error {
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

	addRecommendationQuery := `INSERT OR IGNORE INTO user_recommended_artists (user_id, artist_id) VALUES ($1, $2)`
	_, err = tx.ExecContext(ctx, addRecommendationQuery, userId, artist.ID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) SetUserRecommendedArtists(userId uuid.UUID, artists []*types.TidalArtist) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	deleteRecommendationsQuery := `DELETE FROM user_recommended_artists WHERE user_id = $1`
	_, err = tx.ExecContext(ctx, deleteRecommendationsQuery, userId)
	if err != nil {
		return err
	}

	upsertArtistQuery := `
		INSERT INTO tidal_artists (id, payload, updated_at)
		VALUES ($1, $2, unixepoch())
		ON CONFLICT(id) DO UPDATE
		SET payload = excluded.payload, updated_at = excluded.updated_at`

	addRecommendationQuery := `INSERT OR IGNORE INTO user_recommended_artists (user_id, artist_id) VALUES ($1, $2)`

	for _, artist := range artists {
		if artist == nil {
			return errors.New("artist is nil")
		}

		payload, err := marshalPayload(artist)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx, upsertArtistQuery, artist.ID, payload)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx, addRecommendationQuery, userId, artist.ID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (db *DB) GetUserRecommendedArtists(userId uuid.UUID) ([]types.TidalArtist, error) {
	query := `
		SELECT tidal_artists.payload
		FROM user_recommended_artists
		INNER JOIN tidal_artists ON tidal_artists.id = user_recommended_artists.artist_id
		WHERE user_recommended_artists.user_id = $1
		ORDER BY user_recommended_artists.rowid ASC`

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

		artist, err := unmarshalArtistPayload(payload)
		if err != nil {
			return nil, err
		}

		artists = append(artists, artist)
	}

	return artists, rows.Err()
}

func (db *DB) DeleteAllUserRecommendedArtists(userId uuid.UUID) error {
	query := `DELETE FROM user_recommended_artists WHERE user_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId)
	return err
}

func (db *DB) AddUserRecommendedAlbum(userId uuid.UUID, album *types.TidalAlbum, recommendedFromAlbum *types.TidalAlbum) error {
	if album == nil {
		return errors.New("album is nil")
	}

	if recommendedFromAlbum == nil {
		return errors.New("recommendedFromAlbum is nil")
	}

	albumPayload, err := marshalPayload(album)
	if err != nil {
		return err
	}

	recommendedFromPayload, err := marshalPayload(recommendedFromAlbum)
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

	_, err = tx.ExecContext(ctx, upsertAlbumQuery, album.ID, albumPayload)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, upsertAlbumQuery, recommendedFromAlbum.ID, recommendedFromPayload)
	if err != nil {
		return err
	}

	addRecommendationQuery := `
		INSERT OR IGNORE INTO user_recommended_albums (user_id, album_id, album_recommended_from_id)
		VALUES ($1, $2, $3)`
	_, err = tx.ExecContext(ctx, addRecommendationQuery, userId, album.ID, recommendedFromAlbum.ID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) SetUserRecommendedAlbums(userId uuid.UUID, albums []data.UserRecommendedAlbum) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	deleteRecommendationsQuery := `DELETE FROM user_recommended_albums WHERE user_id = $1`
	_, err = tx.ExecContext(ctx, deleteRecommendationsQuery, userId)
	if err != nil {
		return err
	}

	upsertAlbumQuery := `
		INSERT INTO tidal_albums (id, payload, updated_at)
		VALUES ($1, $2, unixepoch())
		ON CONFLICT(id) DO UPDATE
		SET payload = excluded.payload, updated_at = excluded.updated_at`

	addRecommendationQuery := `
		INSERT OR IGNORE INTO user_recommended_albums (user_id, album_id, album_recommended_from_id)
		VALUES ($1, $2, $3)`

	for _, recommendation := range albums {
		albumPayload, err := marshalPayload(recommendation.Album)
		if err != nil {
			return err
		}

		recommendedFromPayload, err := marshalPayload(recommendation.RecommendedFromAlbum)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx, upsertAlbumQuery, recommendation.Album.ID, albumPayload)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(
			ctx,
			upsertAlbumQuery,
			recommendation.RecommendedFromAlbum.ID,
			recommendedFromPayload,
		)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(
			ctx,
			addRecommendationQuery,
			userId,
			recommendation.Album.ID,
			recommendation.RecommendedFromAlbum.ID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (db *DB) GetUserRecommendedAlbums(userId uuid.UUID) ([]data.UserRecommendedAlbum, error) {
	query := `
		SELECT recommended.payload, recommended_from.payload
		FROM user_recommended_albums
		INNER JOIN tidal_albums AS recommended ON recommended.id = user_recommended_albums.album_id
		INNER JOIN tidal_albums AS recommended_from ON recommended_from.id = user_recommended_albums.album_recommended_from_id
		WHERE user_recommended_albums.user_id = $1
		ORDER BY user_recommended_albums.rowid ASC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	albums := []data.UserRecommendedAlbum{}
	for rows.Next() {
		var albumPayload string
		var recommendedFromPayload string

		if err := rows.Scan(&albumPayload, &recommendedFromPayload); err != nil {
			return nil, err
		}

		album, err := unmarshalAlbumPayload(albumPayload)
		if err != nil {
			return nil, err
		}

		recommendedFromAlbum, err := unmarshalAlbumPayload(recommendedFromPayload)
		if err != nil {
			return nil, err
		}

		albums = append(albums, data.UserRecommendedAlbum{
			Album:                album,
			RecommendedFromAlbum: recommendedFromAlbum,
		})
	}

	return albums, rows.Err()
}

func (db *DB) DeleteAllUserRecommendedAlbums(userId uuid.UUID) error {
	query := `DELETE FROM user_recommended_albums WHERE user_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId)
	return err
}

func (db *DB) AddUserRecommendedTrack(userId uuid.UUID, track *types.TidalSong) error {
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

	addRecommendationQuery := `INSERT OR IGNORE INTO user_recommended_tracks (user_id, track_id) VALUES ($1, $2)`
	_, err = tx.ExecContext(ctx, addRecommendationQuery, userId, track.ID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) SetUserRecommendedTracks(userId uuid.UUID, tracks []types.TidalSong) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	deleteRecommendationsQuery := `DELETE FROM user_recommended_tracks WHERE user_id = $1`
	_, err = tx.ExecContext(ctx, deleteRecommendationsQuery, userId)
	if err != nil {
		return err
	}

	addRecommendationQuery := `INSERT OR IGNORE INTO user_recommended_tracks (user_id, track_id) VALUES ($1, $2)`
	for _, track := range tracks {
		err = db.InsertTidalTrack(&track, tx)
		if err != nil {
			return err
		}

		_, err = tx.ExecContext(ctx, addRecommendationQuery, userId, track.ID)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (db *DB) GetUserRecommendedTracks(userId uuid.UUID) ([]types.TidalSong, error) {
	query := `
		SELECT tidal_tracks.payload
		FROM user_recommended_tracks
		INNER JOIN tidal_tracks ON tidal_tracks.id = user_recommended_tracks.track_id
		WHERE user_recommended_tracks.user_id = $1
		ORDER BY user_recommended_tracks.rowid ASC`

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

		track, err := unmarshalTrackPayload(payload)
		if err != nil {
			return nil, err
		}

		tracks = append(tracks, track)
	}

	return tracks, rows.Err()
}

func (db *DB) DeleteAllUserRecommendedTracks(userId uuid.UUID) error {
	query := `DELETE FROM user_recommended_tracks WHERE user_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId)
	return err
}
