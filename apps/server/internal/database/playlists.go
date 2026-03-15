package database

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/types"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
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
	ID             int64             `db:"id" json:"id"`
	Name           string            `db:"name" json:"name"`
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

func appendUniqueCoverURL(coverURLs []string, seen map[string]struct{}, cover *string) []string {
	if len(coverURLs) >= 4 || cover == nil {
		return coverURLs
	}

	if _, exists := seen[*cover]; exists {
		return coverURLs
	}

	seen[*cover] = struct{}{}

	return append(coverURLs, *cover)
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

func (db *DB) GetUserPlaylists(userId uuid.UUID) ([]UserPlaylistSummary, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	type PlaylistResult struct {
		PlaylistId   int64  `db:"playlist_id"`
		PlaylistName string `db:"playlist_name"`
	}

	playlistsQuery := `
		SELECT playlists.id as playlist_id, playlists.name as playlist_name
		FROM playlists
		WHERE user_id = $1
		ORDER BY created_at DESC`

	playlistResults := []PlaylistResult{}
	err := db.SelectContext(ctx, &playlistResults, playlistsQuery, userId)
	if err != nil {
		return nil, err
	}

	if len(playlistResults) == 0 {
		return []UserPlaylistSummary{}, nil
	}

	playlistIds := []int64{}
	for _, result := range playlistResults {
		playlistIds = append(playlistIds, result.PlaylistId)
	}

	playlistsMap := make(map[int64]UserPlaylistSummary)
	seenCoverURLsByPlaylistId := map[int64]map[string]struct{}{}

	for _, result := range playlistResults {
		_, exists := playlistsMap[result.PlaylistId]
		if !exists {
			playlistsMap[result.PlaylistId] = UserPlaylistSummary{
				ID:             result.PlaylistId,
				Name:           result.PlaylistName,
				NumberOfTracks: 0,
				Duration:       0,
				CoverURLs:      []string{},
			}

			seenCoverURLsByPlaylistId[result.PlaylistId] = map[string]struct{}{}
		}
	}

	tracksQuery, args, err := sqlx.In(`
		SELECT
			pt.playlist_id,
			tt.duration,
			tal.cover
		FROM playlist_tracks pt
		JOIN tidal_tracks tt ON tt.id = pt.track_id
		JOIN tidal_artists ta ON tt.artist_id = ta.id
		JOIN tidal_albums tal ON tt.album_id = tal.id
		WHERE pt.playlist_id IN (?)
		ORDER BY pt.created_at ASC
	`, playlistIds)
	if err != nil {
		return nil, err
	}

	tracksQuery = db.Rebind(tracksQuery)

	rows, err := db.QueryContext(ctx, tracksQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var playlistID int64
		track := types.TidalSong{}
		album := types.TidalAlbum{}
		err = rows.Scan(
			&playlistID,
			&track.Duration,
			&album.Cover,
		)
		if err != nil {
			return nil, err
		}

		summary := playlistsMap[playlistID]

		summary.NumberOfTracks++
		summary.Duration += track.Duration
		summary.CoverURLs = appendUniqueCoverURL(
			summary.CoverURLs,
			seenCoverURLsByPlaylistId[playlistID],
			album.Cover,
		)

		playlistsMap[playlistID] = summary
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	playlists := []UserPlaylistSummary{}
	for _, playlist := range playlistResults {
		playlists = append(playlists, playlistsMap[playlist.PlaylistId])
	}

	return playlists, nil
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
		FROM playlist_tracks
		JOIN tidal_tracks tt ON tt.id = playlist_tracks.track_id
		JOIN tidal_artists ta ON tt.artist_id = ta.id
		JOIN tidal_albums tal ON tt.album_id = tal.id
		WHERE playlist_tracks.playlist_id = $1
		ORDER BY playlist_tracks.created_at ASC`

	seenCoverURLs := map[string]struct{}{}

	rows, err := db.QueryContext(ctx, tracksQuery, playlistID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

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

		playlist.Tracks = append(playlist.Tracks, track)
		playlist.NumberOfTracks++
		playlist.Duration += track.Duration
		playlist.CoverURLs = appendUniqueCoverURL(playlist.CoverURLs, seenCoverURLs, album.Cover)
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

	deletePlaylistQuery := `DELETE FROM playlists WHERE user_id = $1 AND id = $2`
	_, err = tx.ExecContext(ctx, deletePlaylistQuery, userID, playlistID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (db *DB) AddTrackToPlaylist(userID uuid.UUID, playlistID int64, track *types.TidalSong) error {
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

	var count int
	checkPlaylistQuery := `SELECT COUNT(1) FROM playlists WHERE user_id = $1 AND id = $2`
	err = tx.QueryRowContext(ctx, checkPlaylistQuery, userID, playlistID).Scan(&count)
	if err != nil {
		return err
	}

	if count == 0 {
		return ErrRecordNotFound
	}

	err = db.InsertTidalTrack(track, tx)
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

	return tx.Commit()
}

func (db *DB) GetTrackPlaylists(userId uuid.UUID, trackId int64) ([]TrackPlaylist, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	query := `
		SELECT
			playlists.id as playlist_id,
			playlists.name as playlist_name,
			tal.cover
		FROM playlists
		LEFT JOIN playlist_tracks ON playlist_tracks.playlist_id = playlists.id
		LEFT JOIN tidal_tracks tt ON tt.id = playlist_tracks.track_id
		LEFT JOIN tidal_albums tal ON tt.album_id = tal.id
		WHERE playlists.user_id = $1
		AND EXISTS (
			SELECT 1
			FROM playlist_tracks AS matching_tracks
			WHERE matching_tracks.playlist_id = playlists.id
			AND matching_tracks.track_id = $2
		)
		ORDER BY playlists.created_at DESC, playlist_tracks.created_at ASC`

	playlists := []TrackPlaylist{}
	indexById := map[int64]int{}
	seenCoverURLsByPlaylistId := map[int64]map[string]struct{}{}

	rows, err := db.QueryContext(ctx, query, userId, trackId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var playlistId int64
		var playlistName string
		album := types.TidalAlbum{}
		err = rows.Scan(
			&playlistId,
			&playlistName,
			&album.Cover,
		)
		if err != nil {
			return nil, err
		}

		index, exists := indexById[playlistId]
		if !exists {
			playlists = append(playlists, TrackPlaylist{
				ID:        playlistId,
				Name:      playlistName,
				CoverURLs: []string{},
			})
			index = len(playlists) - 1
			indexById[playlistId] = index
			seenCoverURLsByPlaylistId[playlistId] = map[string]struct{}{}
		}

		playlists[index].CoverURLs = appendUniqueCoverURL(
			playlists[index].CoverURLs,
			seenCoverURLsByPlaylistId[playlistId],
			album.Cover,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return playlists, nil
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
