package database

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/data"
	"github.com/jmoiron/sqlx"
	"github.com/twoscott/gobble-fm/lastfm"
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
		INSERT INTO lastfm_tracks (title, duration, artist_name, artist_mbid)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT DO UPDATE
		SET title = excluded.title,
				duration = excluded.duration,
				artist_name = excluded.artist_name,
				artist_mbid = excluded.artist_mbid,
				updated_at = unixepoch()
		RETURNING id`

	args := []any{track.Title, track.Duration, track.ArtistName, track.ArtistMbid}

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query, args...).Scan(&track.ID)
	} else {
		err = db.QueryRowContext(ctx, query, args...).Scan(&track.ID)
	}

	return track, err
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

		err := rows.Scan(
			&recommendation.LastfmTrack.ID,
			&recommendation.LastfmTrack.Title,
			&duration,
			&recommendation.LastfmTrack.ArtistName,
			&artistMBID,
			&recommendation.Match,
		)
		if err != nil {
			return nil, err
		}

		if duration.Valid {
			d := lastfm.Duration(duration.Int64)
			recommendation.LastfmTrack.Duration = &d
		}

		if artistMBID.Valid {
			mbid := artistMBID.String
			recommendation.LastfmTrack.ArtistMbid = &mbid
		}

		result = append(result, recommendation)
	}

	return result, rows.Err()
}
