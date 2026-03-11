package database

import (
	"encoding/json"

	"github.com/altierawr/oto/internal/types"
)

func unmarshalTrackPayload(payload string) (types.TidalSong, error) {
	var track types.TidalSong
	err := json.Unmarshal([]byte(payload), &track)
	if err != nil {
		return types.TidalSong{}, err
	}

	return track, nil
}

func unmarshalArtistPayload(payload string) (types.TidalArtist, error) {
	var artist types.TidalArtist

	err := json.Unmarshal([]byte(payload), &artist)
	if err != nil {
		return types.TidalArtist{}, err
	}

	return artist, nil
}

func unmarshalAlbumPayload(payload string) (types.TidalAlbum, error) {
	var album types.TidalAlbum

	err := json.Unmarshal([]byte(payload), &album)
	if err != nil {
		return types.TidalAlbum{}, err
	}

	return album, nil
}
