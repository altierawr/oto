package data

import (
	"github.com/twoscott/gobble-fm/lastfm"
)

type LastfmTrack struct {
	ID         int
	Title      string
	Duration   *lastfm.Duration
	ArtistName string
	ArtistMbid *string
}
