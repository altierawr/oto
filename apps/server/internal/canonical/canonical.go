package canonical

import (
	"strings"
	"unicode"

	"github.com/altierawr/oto/internal/types"
)

type TrackFields struct {
	PrimaryArtist   string
	Title           string
	TrackKey        string
	AlbumTitle      string
	AlbumKey        string
	AlbumTrackCount *int
}

func Normalize(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	if s == "" {
		return ""
	}

	var b strings.Builder
	b.Grow(len(s))

	for _, r := range s {
		switch {
		case unicode.IsLetter(r), unicode.IsNumber(r):
			b.WriteRune(r)
		case r == '&':
			b.WriteString(" and ")
		case unicode.IsSpace(r), r == '-', r == '_', r == '/', r == '.', r == ',', r == '\'', r == '"', r == '(', r == ')', r == '[', r == ']':
			b.WriteByte(' ')
		default:
			// drop other punctuation/symbols
		}
	}

	// collapse repeated whitespace
	return strings.Join(strings.Fields(b.String()), " ")
}

func TrackKey(primaryArtist, title string) string {
	a := Normalize(primaryArtist)
	t := Normalize(title)
	if a == "" || t == "" {
		return ""
	}
	return a + "|" + t
}

func AlbumKey(primaryArtist, albumTitle string) string {
	a := Normalize(primaryArtist)
	al := Normalize(albumTitle)
	if a == "" || al == "" {
		return ""
	}
	return a + "|" + al
}

func TrackFieldsFromTidalTrack(track *types.TidalSong) TrackFields {
	if track == nil {
		return TrackFields{}
	}

	artist := ""
	if len(track.Artists) > 0 {
		artist = track.Artists[0].Name
	}

	albumCnt := 0
	var albumCntPtr *int
	if track.Album.NumberOfTracks != nil && *track.Album.NumberOfTracks > 0 {
		albumCnt = *track.Album.NumberOfTracks
		albumCntPtr = &albumCnt
	}

	primaryArtist := Normalize(artist)
	title := Normalize(track.Title)
	albumTitle := Normalize(track.Album.Title)

	return TrackFields{
		PrimaryArtist:   primaryArtist,
		Title:           title,
		TrackKey:        TrackKey(artist, track.Title),
		AlbumTitle:      albumTitle,
		AlbumKey:        AlbumKey(artist, track.Album.Title),
		AlbumTrackCount: albumCntPtr,
	}
}
