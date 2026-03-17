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

func (db *DB) InsertTidalArtist(artist *types.TidalArtist, tx *sqlx.Tx) error {
	if artist == nil {
		return errors.New("artist is nil")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		INSERT INTO tidal_artists (id, name, picture, updated_at)
		VALUES ($1, $2, $3, unixepoch())
		ON CONFLICT DO UPDATE
		SET name = COALESCE(tidal_artists.name, excluded.name),
				picture = COALESCE(tidal_artists.picture, excluded.picture),
				updated_at = excluded.updated_at
		`

	args := []any{artist.ID, artist.Name, artist.Picture}

	var err error
	if tx != nil {
		_, err = tx.ExecContext(ctx, query, args...)
	} else {
		_, err = db.ExecContext(ctx, query, args...)
	}

	return err
}

func (db *DB) InsertTidalAlbum(album *types.TidalAlbum, tx *sqlx.Tx) error {
	if album == nil {
		return errors.New("album is nil")
	}

	if len(album.Artists) == 0 {
		return errors.New("album needs at least one artist")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		INSERT INTO tidal_albums (
			id, cover, duration, explicit, number_of_tracks, number_of_volumes,
		  release_date, title, type, upc, vibrant_color, video_cover, artist_id, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, unixepoch())
		ON CONFLICT DO UPDATE
		SET cover = COALESCE(tidal_albums.cover, excluded.cover),
				duration = COALESCE(tidal_albums.duration, excluded.duration),
				explicit = COALESCE(tidal_albums.explicit, excluded.explicit),
				number_of_tracks = COALESCE(tidal_albums.number_of_tracks, excluded.number_of_tracks),
				number_of_volumes = COALESCE(tidal_albums.number_of_volumes, excluded.number_of_volumes),
				release_date = COALESCE(tidal_albums.release_date, excluded.release_date),
				title = COALESCE(tidal_albums.title, excluded.title),
				type = COALESCE(tidal_albums.type, excluded.type),
				upc = COALESCE(tidal_albums.upc, excluded.upc),
				vibrant_color = COALESCE(tidal_albums.vibrant_color, excluded.vibrant_color),
				video_cover = COALESCE(tidal_albums.video_cover, excluded.video_cover),
				artist_id = COALESCE(excluded.artist_id, tidal_albums.artist_id),
				updated_at = excluded.updated_at
		`

	args := []any{
		album.ID, album.Cover, album.Duration, album.Explicit, album.NumberOfTracks, album.NumberOfVolumes,
		album.ReleaseDate, album.Title, album.Type, album.UPC, album.VibrantColor, album.VideoCover, album.Artists[0].ID,
	}

	transaction := tx
	if transaction == nil {
		txx, err := db.BeginTxx(ctx, nil)
		if err != nil {
			return err
		}
		defer txx.Rollback()

		transaction = txx
	}

	_, err := transaction.ExecContext(ctx, query, args...)

	if err != nil {
		if err.Error() != "FOREIGN KEY constraint failed" {
			return err
		}

		// if the error was a foreign key fail, the artist doesn't exist in the database so let's insert it and retry
		err = db.InsertTidalArtist(&album.Artists[0], transaction)
		if err != nil {
			return err
		}

		_, err = transaction.ExecContext(ctx, query, args...)
	}

	if tx != nil {
		return nil
	} else {
		return transaction.Commit()
	}
}

func (db *DB) InsertTidalArtists(artists []types.TidalArtist, tx *sqlx.Tx) error {
	for _, artist := range artists {
		err := db.InsertTidalArtist(&artist, tx)
		if err != nil {
			return err
		}
	}

	return nil
}

func (db *DB) InsertTidalAlbums(albums []types.TidalAlbum, tx *sqlx.Tx) error {
	for _, album := range albums {
		err := db.InsertTidalAlbum(&album, tx)
		if err != nil {
			return err
		}
	}

	return nil
}

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

	if len(track.Artists) == 0 {
		return errors.New("album needs at least one artist")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		INSERT INTO tidal_tracks (
			id, bpm, duration, explicit, isrc, stream_start_date, title, track_number, volume_number, artist_id, album_id, updated_at, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, unixepoch(), unixepoch())
		ON CONFLICT DO UPDATE
		SET bpm = COALESCE(tidal_tracks.bpm, excluded.bpm),
				duration = COALESCE(tidal_tracks.duration, excluded.duration),
				explicit = COALESCE(tidal_tracks.explicit, excluded.explicit),
				isrc = COALESCE(tidal_tracks.isrc, excluded.isrc),
				stream_start_date = COALESCE(tidal_tracks.stream_start_date, excluded.stream_start_date),
				title = COALESCE(tidal_tracks.title, excluded.title),
				track_number = COALESCE(tidal_tracks.track_number, excluded.track_number),
				volume_number = COALESCE(tidal_tracks.volume_number, excluded.volume_number),
				artist_id = COALESCE(excluded.artist_id, tidal_tracks.artist_id),
				album_id = COALESCE(excluded.album_id, tidal_tracks.album_id),
				updated_at = excluded.updated_at
		RETURNING (created_at = updated_at) AS is_new_row`

	args := []any{
		track.ID, track.Bpm, track.Duration, track.Explicit, track.ISRC, track.StreamStartDate, track.Title, track.TrackNumber, track.VolumeNumber,
		track.Artists[0].ID, track.Album.ID,
	}

	transaction := tx
	if transaction == nil {
		txx, err := db.BeginTxx(ctx, nil)
		if err != nil {
			return err
		}
		defer txx.Rollback()

		transaction = txx
	}

	var isNewRow bool
	err := transaction.QueryRowContext(ctx, query, args...).Scan(&isNewRow)
	if err != nil {
		if !strings.Contains(err.Error(), "FOREIGN KEY constraint failed") {
			return err
		}

		// if the error was a foreign key fail, either the artist or album was missing so let's insert them and retry
		err = db.InsertTidalArtist(&track.Artists[0], transaction)
		if err != nil {
			return err
		}

		if len(track.Album.Artists) == 0 {
			track.Album.Artists = track.Artists
		}

		err = db.InsertTidalAlbum(track.Album, transaction)
		if err != nil {
			return err
		}

		err = transaction.QueryRowContext(ctx, query, args...).Scan(&isNewRow)
		if err != nil {
			return err
		}
	}

	if isNewRow && db.onTidalTrackUpsert != nil {
		defer db.onTidalTrackUpsert(int64(track.ID))
	}

	if tx != nil {
		return nil
	} else {
		return transaction.Commit()
	}
}

func (db *DB) GetMissingTidalArtistIds() ([]int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT DISTINCT artist_id
		FROM tidal_tracks tt
		WHERE NOT EXISTS (
			SELECT 1 FROM tidal_artists ta WHERE ta.id = tt.artist_id
		)`

	ids := []int64{}
	err := db.SelectContext(ctx, &ids, query)
	if err != nil {
		return nil, err
	}

	return ids, nil
}

func (db *DB) GetMissingTidalAlbumIds() ([]int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT DISTINCT album_id
		FROM tidal_tracks tt
		WHERE NOT EXISTS (
			SELECT 1 FROM tidal_albums tal WHERE tal.id = tt.album_id
		)`

	ids := []int64{}
	err := db.SelectContext(ctx, &ids, query)
	if err != nil {
		return nil, err
	}

	return ids, nil
}

func (db *DB) GetTidalTrack(id int64) (*types.TidalSong, error) {
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
		FROM tidal_tracks tt
		JOIN tidal_artists ta ON tt.artist_id = ta.id
		JOIN tidal_albums tal ON tt.album_id = tal.id
		WHERE tt.id = $1`

	track := types.TidalSong{}
	artist := types.TidalArtist{}
	album := types.TidalAlbum{}
	err := db.QueryRowContext(ctx, query, id).Scan(
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
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	track.Artists = []types.TidalArtist{artist}
	track.Album = &album

	return &track, nil
}

func (db *DB) GetTidalAlbum(id int) (*types.TidalAlbum, error) {
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
	    tal.video_cover,
	    aa.id,
	    aa.name,
	    aa.picture,
	    aa.selected_album_cover_fallback
		FROM tidal_tracks tt
		JOIN tidal_artists ta ON tt.artist_id = ta.id
		JOIN tidal_albums tal ON tt.album_id = tal.id
		JOIN tidal_artists aa ON tal.artist_id = aa.id
		WHERE tal.id = $1
		ORDER BY tt.volume_number ASC, tt.track_number ASC`

	rows, err := db.QueryContext(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tracks := []types.TidalSong{}
	var album *types.TidalAlbum
	for rows.Next() {
		track := types.TidalSong{}
		artist := types.TidalArtist{}
		scanAlbum := types.TidalAlbum{}
		albumArtist := types.TidalArtist{}
		err := rows.Scan(
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
			&scanAlbum.ID,
			&scanAlbum.Cover,
			&scanAlbum.Duration,
			&scanAlbum.Explicit,
			&scanAlbum.NumberOfTracks,
			&scanAlbum.NumberOfVolumes,
			&scanAlbum.ReleaseDate,
			&scanAlbum.Title,
			&scanAlbum.Type,
			&scanAlbum.UPC,
			&scanAlbum.VibrantColor,
			&scanAlbum.VideoCover,
			&albumArtist.ID,
			&albumArtist.Name,
			&albumArtist.Picture,
			&albumArtist.SelectedAlbumCoverFallback,
		)
		if err != nil {
			return nil, err
		}

		track.Artists = []types.TidalArtist{artist}
		scanAlbum.Artists = []types.TidalArtist{albumArtist}
		track.Album = &scanAlbum
		album = &scanAlbum
		tracks = append(tracks, track)
	}

	album.Songs = tracks

	return album, rows.Err()
}

func (db *DB) GetTidalTrackByArtistAndTitle(artistName string, title string) (*types.TidalSong, error) {
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
		FROM tidal_tracks tt
		INNER JOIN tidal_artists ta ON tt.artist_id = ta.id
		INNER JOIN tidal_albums tal ON tt.album_id = tal.id
		WHERE LOWER(TRIM(ta.name)) = LOWER(TRIM($1))
			AND LOWER(TRIM(tt.title)) = LOWER(TRIM($2))
		ORDER BY tt.updated_at DESC
		LIMIT 1`

	track := types.TidalSong{}
	artist := types.TidalArtist{}
	album := types.TidalAlbum{}
	err := db.QueryRowContext(ctx, query, artistName, title).Scan(
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
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	track.Artists = []types.TidalArtist{artist}
	track.Album = &album

	return &track, nil
}

func (db *DB) GetTidalAlbumByArtistAndTitle(artistName string, title string) (*types.TidalAlbum, error) {
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
			tal.video_cover,
			aa.id,
			aa.name,
			aa.picture,
			aa.selected_album_cover_fallback
		FROM tidal_tracks tt
		JOIN tidal_artists ta ON tt.artist_id = ta.id
		JOIN tidal_albums tal ON tt.album_id = tal.id
		JOIN tidal_artists aa ON tal.artist_id = aa.id
		WHERE LOWER(TRIM(aa.name)) = LOWER(TRIM($1))
			AND LOWER(TRIM(tal.title)) = LOWER(TRIM($2))
		ORDER BY tt.volume_number ASC, tt.track_number ASC`

	rows, err := db.QueryContext(ctx, query, artistName, title)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tracks := []types.TidalSong{}
	var album *types.TidalAlbum
	for rows.Next() {
		track := types.TidalSong{}
		artist := types.TidalArtist{}
		scanAlbum := types.TidalAlbum{}
		albumArtist := types.TidalArtist{}
		err := rows.Scan(
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
			&scanAlbum.ID,
			&scanAlbum.Cover,
			&scanAlbum.Duration,
			&scanAlbum.Explicit,
			&scanAlbum.NumberOfTracks,
			&scanAlbum.NumberOfVolumes,
			&scanAlbum.ReleaseDate,
			&scanAlbum.Title,
			&scanAlbum.Type,
			&scanAlbum.UPC,
			&scanAlbum.VibrantColor,
			&scanAlbum.VideoCover,
			&albumArtist.ID,
			&albumArtist.Name,
			&albumArtist.Picture,
			&albumArtist.SelectedAlbumCoverFallback,
		)
		if err != nil {
			return nil, err
		}

		track.Artists = []types.TidalArtist{artist}
		scanAlbum.Artists = []types.TidalArtist{albumArtist}
		track.Album = &scanAlbum
		album = &scanAlbum
		tracks = append(tracks, track)
	}

	if album != nil {
		album.Songs = tracks
	}

	return album, rows.Err()
}
