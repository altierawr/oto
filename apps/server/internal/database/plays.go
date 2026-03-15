package database

import (
	"context"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/canonical"
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

func (db *DB) GetUserTopPlayedTracks(userId uuid.UUID, decayDays float64) ([]types.TidalSong, error) {
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
	  FROM ranked
	  JOIN tidal_tracks tt ON tt.id = ranked.track_id
		JOIN tidal_artists ta ON tt.artist_id = ta.id
		JOIN tidal_albums tal ON tt.album_id = tal.id
	  ORDER BY ranked.weighted_score DESC, ranked.play_count DESC, ranked.last_played_at DESC
	  LIMIT :limit`

	rows, err := db.NamedQueryContext(ctx, query, map[string]any{
		"decay_days": decayDays,
		"user_id":    userId.String(),
		"limit":      50,
	})
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tracks := []types.TidalSong{}
	for rows.Next() {
		track := types.TidalSong{}
		artist := types.TidalArtist{}
		album := types.TidalAlbum{}
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

	return tracks, rows.Err()
}

func (db *DB) HasUserPlayedTrackByID(userId uuid.UUID, trackId int) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT COUNT(1)
		FROM plays
		WHERE plays.user_id = $1
			AND plays.track_id = $2`

	var count int
	err := db.QueryRowContext(ctx, query, userId, trackId).Scan(&count)
	if err != nil {
		return false, nil
	}

	return count > 0, nil
}

func (db *DB) HasUserPlayedTrackByArtistAndTitle(userId uuid.UUID, artistName, title string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT COUNT(1)
		FROM plays
		JOIN tidal_tracks tt ON tt.id = plays.track_id
		WHERE plays.user_id = $1
			AND tt.canonical_track_key == $2`

	var count int
	err := db.QueryRowContext(ctx, query, userId, canonical.TrackKey(artistName, title)).Scan(&count)
	if err != nil {
		return false, nil
	}

	return count > 0, nil
}

func (db *DB) GetUserTrackPlayKeys(userId uuid.UUID) (*[]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT DISTINCT tt.canonical_track_key
		FROM plays
		JOIN tidal_tracks tt ON tt.id = plays.track_id
		WHERE p.user_id = $1
		AND tt.canonical_track_key != ''
		AND tt.canonical_track_key != '|'`

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := []string{}
	for rows.Next() {
		var key string

		if err = rows.Scan(&key); err != nil {
			return nil, err
		}

		keys = append(keys, key)
	}

	return &keys, rows.Err()
}

type AlbumPlayStats struct {
	CanonicalAlbumKey      string
	ManualDistinctTracks   int
	AutoplayDistinctTracks int
	AlbumTrackCount        int
}

func (db *DB) GetUserAlbumPlayKeys(userId uuid.UUID) (*[]AlbumPlayStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
	SELECT
    tt.canonical_album_key,
    COUNT(DISTINCT CASE WHEN plays.is_autoplay = 0 THEN tt.canonical_track_key END) AS manual_distinct_tracks,
    COUNT(DISTINCT CASE WHEN plays.is_autoplay = 1 THEN tt.canonical_track_key END) AS autoplay_distinct_tracks,
    MAX(CASE WHEN tt.album_track_count > 0 THEN tt.album_track_count END) AS album_track_count
  FROM plays
  JOIN tidal_tracks tt ON tt.id = plays.track_id
  WHERE plays.user_id = $1
    AND tt.canonical_album_key != ''
    AND tt.canonical_album_key != '|'
  GROUP BY tt.canonical_album_key;`

	rows, err := db.QueryContext(ctx, query, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []AlbumPlayStats
	for rows.Next() {
		var stat AlbumPlayStats

		err := rows.Scan(
			&stat.CanonicalAlbumKey,
			&stat.ManualDistinctTracks,
			&stat.AutoplayDistinctTracks,
			&stat.AlbumTrackCount,
		)
		if err != nil {
			return nil, err
		}

		results = append(results, stat)
	}

	return &results, rows.Err()
}
