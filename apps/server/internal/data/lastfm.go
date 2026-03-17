package data

import (
	"time"
)

type LastfmTrack struct {
	ID         int            `db:"id"`
	Mbid       *string        `db:"mbid"`
	Title      string         `db:"title"`
	Duration   *time.Duration `db:"duration"`
	ArtistName string         `db:"artist_name"`
	ArtistMbid *string        `db:"artist_mbid"`
	AlbumTitle *string        `db:"album_title"`
	AlbumMbid  *string        `db:"album_mbid"`
	CreatedAt  *int64         `db:"created_at"`
	UpdatedAt  *int64         `db:"updated_at"`
}
