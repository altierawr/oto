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

	addRecommendationQuery := `INSERT OR IGNORE INTO user_recommended_artists (user_id, artist_id) VALUES ($1, $2)`

	for _, artist := range artists {
		if artist == nil {
			return errors.New("artist is nil")
		}

		err = db.InsertTidalArtist(artist, tx)
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
		SELECT tidal_artists.*
		FROM user_recommended_artists
		INNER JOIN tidal_artists ON tidal_artists.id = user_recommended_artists.artist_id
		WHERE user_recommended_artists.user_id = $1
		ORDER BY user_recommended_artists.rowid ASC`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	artists := []types.TidalArtist{}
	err := db.SelectContext(ctx, &artists, query, userId)
	if err != nil {
		return nil, err
	}

	return artists, nil
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

	err = db.InsertTidalAlbum(recommendedFromAlbum, tx)
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

	addRecommendationQuery := `
		INSERT OR IGNORE INTO user_recommended_albums (user_id, album_id, album_recommended_from_id)
		VALUES ($1, $2, $3)`

	for _, recommendation := range albums {
		err = db.InsertTidalAlbum(&recommendation.Album, tx)
		if err != nil {
			return err
		}

		err = db.InsertTidalAlbum(&recommendation.RecommendedFromAlbum, tx)
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
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT
			tal.id,
			tal.cover,
			tal.duration,
			tal.explicit,
			tal.number_of_tracks,
			tal.number_of_volumes,
			tal.release_date,
			tal.title,
			tal.type,
			tal.upc,
			tal.vibrant_color,
			tal.video_cover,
			ta.id,
			ta.name,
			ta.picture,
			ta.selected_album_cover_fallback,
			tral.id,
			tral.cover,
			tral.duration,
			tral.explicit,
			tral.number_of_tracks,
			tral.number_of_volumes,
			tral.release_date,
			tral.title,
			tral.type,
			tral.upc,
			tral.vibrant_color,
			tral.video_cover,
			tra.id,
			tra.name,
			tra.picture,
			tra.selected_album_cover_fallback
		FROM user_recommended_albums
		INNER JOIN tidal_albums AS tal ON tal.id = user_recommended_albums.album_id
		INNER JOIN tidal_artists ta ON tal.artist_id = ta.id
		INNER JOIN tidal_albums AS tral ON tral.id = user_recommended_albums.album_recommended_from_id
		INNER JOIN tidal_artists tra ON tral.artist_id = tra.id
		WHERE user_recommended_albums.user_id = $1
		ORDER BY user_recommended_albums.rowid ASC`

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	albums := []data.UserRecommendedAlbum{}
	for rows.Next() {
		album := types.TidalAlbum{}
		artist := types.TidalArtist{}
		recommendedFromAlbum := types.TidalAlbum{}
		recommendedFromArtist := types.TidalArtist{}
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
			&recommendedFromAlbum.ID,
			&recommendedFromAlbum.Cover,
			&recommendedFromAlbum.Duration,
			&recommendedFromAlbum.Explicit,
			&recommendedFromAlbum.NumberOfTracks,
			&recommendedFromAlbum.NumberOfVolumes,
			&recommendedFromAlbum.ReleaseDate,
			&recommendedFromAlbum.Title,
			&recommendedFromAlbum.Type,
			&recommendedFromAlbum.UPC,
			&recommendedFromAlbum.VibrantColor,
			&recommendedFromAlbum.VideoCover,
			&recommendedFromArtist.ID,
			&recommendedFromArtist.Name,
			&recommendedFromArtist.Picture,
			&recommendedFromArtist.SelectedAlbumCoverFallback,
		)
		if err != nil {
			return nil, err
		}

		album.Artists = []types.TidalArtist{artist}
		recommendedFromAlbum.Artists = []types.TidalArtist{recommendedFromArtist}
		albums = append(albums, data.UserRecommendedAlbum{
			Album:                album,
			RecommendedFromAlbum: recommendedFromAlbum,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return albums, nil
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
			ta.id,
			ta.name,
			ta.picture,
			ta.selected_album_cover_fallback,
			tal.id,
			tal.cover,
			tal.duration,
			tal.explicit,
			tal.number_of_tracks,
			tal.number_of_volumes,
			tal.release_date,
			tal.title,
			tal.type,
			tal.upc,
			tal.vibrant_color,
			tal.video_cover
		FROM user_recommended_tracks
		INNER JOIN tidal_tracks tt ON tt.id = user_recommended_tracks.track_id
		INNER JOIN tidal_artists ta ON tt.artist_id = ta.id
		INNER JOIN tidal_albums tal ON tt.album_id = tal.id
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

func (db *DB) DeleteAllUserRecommendedTracks(userId uuid.UUID) error {
	query := `DELETE FROM user_recommended_tracks WHERE user_id = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, userId)
	return err
}
