package database

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/data"
	"github.com/jmoiron/sqlx"
)

type TidalLastfmRecommendation struct {
	LastfmTrack data.LastfmTrack
	Match       float64
}

const recommendationQueryTimeout = 10 * time.Second

func (db *DB) InsertLastFmTracks(tracks []data.LastfmTrack, tx *sqlx.Tx) (*[]data.LastfmTrack, error) {
	result := []data.LastfmTrack{}
	for _, track := range tracks {
		t, err := db.InsertLastFmTrack(&track, tx)
		if err != nil {
			return nil, err
		}

		result = append(result, *t)
	}

	return &result, nil
}

func (db *DB) InsertLastFmTrack(track *data.LastfmTrack, tx *sqlx.Tx) (*data.LastfmTrack, error) {
	if track == nil {
		return nil, errors.New("track is nil")
	}

	ctx, cancel := context.WithTimeout(context.Background(), recommendationQueryTimeout)
	defer cancel()

	query := `
		INSERT INTO lastfm_tracks (mbid, title, duration, artist_name, artist_mbid, album_title, album_mbid)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT DO UPDATE
		SET mbid = COALESCE(excluded.mbid, lastfm_tracks.mbid),
				title = excluded.title,
				duration = COALESCE(excluded.duration, lastfm_tracks.duration),
				artist_name = excluded.artist_name,
				artist_mbid = COALESCE(excluded.artist_mbid, lastfm_tracks.artist_mbid),
				album_title = COALESCE(excluded.album_title, lastfm_tracks.album_title),
				album_mbid = COALESCE(excluded.album_mbid, lastfm_tracks.album_mbid),
				updated_at = unixepoch()
		RETURNING id`

	args := []any{
		track.Mbid,
		track.Title,
		track.Duration,
		track.ArtistName,
		track.ArtistMbid,
		track.AlbumTitle,
		track.AlbumMbid,
	}

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query, args...).Scan(&track.ID)
	} else {
		err = db.QueryRowContext(ctx, query, args...).Scan(&track.ID)
	}

	return track, err
}

func (db *DB) GetLastfmTrackByMbid(mbid string) (*data.LastfmTrack, error) {
	ctx, cancel := context.WithTimeout(context.Background(), recommendationQueryTimeout)
	defer cancel()

	query := `
		SELECT * FROM lastfm_tracks
		WHERE mbid = $1`

	track := data.LastfmTrack{}
	err := db.GetContext(ctx, &track, query, mbid)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &track, nil
}

func (db *DB) GetLastfmTrackByArtistNameAndTitle(artistName, title string) (*data.LastfmTrack, error) {
	ctx, cancel := context.WithTimeout(context.Background(), recommendationQueryTimeout)
	defer cancel()

	query := `
		SELECT * FROM lastfm_tracks
		WHERE artist_name = $1
			AND title = $2
		LIMIT 1`

	track := data.LastfmTrack{}
	err := db.GetContext(ctx, &track, query, artistName, title)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &track, nil
}

func (db *DB) GetLastfmTrackById(id int) (*data.LastfmTrack, error) {
	ctx, cancel := context.WithTimeout(context.Background(), recommendationQueryTimeout)
	defer cancel()

	query := `
		SELECT * FROM lastfm_tracks
		WHERE id = $1`

	track := data.LastfmTrack{}
	err := db.GetContext(ctx, &track, query, id)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &track, nil
}

func (db *DB) HasTidalTrackLastfmRecommendations(tidalTrackId int64) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), recommendationQueryTimeout)
	defer cancel()

	query := `
		SELECT COUNT(1)
		FROM tidal_lastfm_recommendations
		WHERE tidal_track_id = $1`

	var count int
	err := db.QueryRowContext(ctx, query, tidalTrackId).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (db *DB) LinkTidalToLastfm(tidalTrackId int64, lastfmTrackId int, match float64) error {
	ctx, cancel := context.WithTimeout(context.Background(), recommendationQueryTimeout)
	defer cancel()

	query := `
		INSERT INTO tidal_lastfm_recommendations (tidal_track_id, lastfm_track_id, match)
		VALUES ($1, $2, $3)
		ON CONFLICT(tidal_track_id, lastfm_track_id) DO UPDATE
		SET match = excluded.match`

	_, err := db.ExecContext(ctx, query, tidalTrackId, lastfmTrackId, match)
	return err
}

func (db *DB) GetLastfmRecommendationsForTidalTrack(tidalTrackId int64) ([]TidalLastfmRecommendation, error) {
	ctx, cancel := context.WithTimeout(context.Background(), recommendationQueryTimeout)
	defer cancel()

	query := `
		SELECT lastfm_tracks.id,
					 lastfm_tracks.title,
					 lastfm_tracks.duration,
					 lastfm_tracks.artist_name,
					 lastfm_tracks.artist_mbid,
					 lastfm_tracks.album_title,
					 lastfm_tracks.album_mbid,
					 tidal_lastfm_recommendations.match
		FROM tidal_lastfm_recommendations
		INNER JOIN lastfm_tracks ON lastfm_tracks.id = tidal_lastfm_recommendations.lastfm_track_id
		WHERE tidal_lastfm_recommendations.tidal_track_id = $1`

	rows, err := db.QueryContext(ctx, query, tidalTrackId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []TidalLastfmRecommendation{}
	for rows.Next() {
		var recommendation TidalLastfmRecommendation
		var duration sql.NullInt64
		var artistMBID sql.NullString
		var albumTitle sql.NullString
		var albumMBID sql.NullString

		err := rows.Scan(
			&recommendation.LastfmTrack.ID,
			&recommendation.LastfmTrack.Title,
			&duration,
			&recommendation.LastfmTrack.ArtistName,
			&artistMBID,
			&albumTitle,
			&albumMBID,
			&recommendation.Match,
		)
		if err != nil {
			return nil, err
		}

		if duration.Valid {
			d := time.Duration(duration.Int64)
			recommendation.LastfmTrack.Duration = &d
		}

		if artistMBID.Valid {
			mbid := artistMBID.String
			recommendation.LastfmTrack.ArtistMbid = &mbid
		}

		if albumTitle.Valid {
			title := albumTitle.String
			if title != "" {
				recommendation.LastfmTrack.AlbumTitle = &title
			}
		}

		if albumMBID.Valid {
			mbid := albumMBID.String
			if mbid != "" {
				recommendation.LastfmTrack.AlbumMbid = &mbid
			}
		}

		result = append(result, recommendation)
	}

	return result, rows.Err()
}
