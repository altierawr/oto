package tidal

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"

	"github.com/altierawr/oto/internal/types"
)

func GetSongStreamUrl(id int64) (*string, error) {
	refreshTokens()

	var playback types.PlaybackInfo
	var manifest types.ManifestData

	tidalURL := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   fmt.Sprintf("/v1/tracks/%d/playbackinfopostpaywall/v4", id),
	}

	q := tidalURL.Query()
	q.Set("audioquality", "LOSSLESS")
	q.Set("playbackmode", "STREAM")
	q.Set("assetpresentation", "FULL")
	tidalURL.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, tidalURL.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))

	req.Header.Set("Accept", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	contentType := res.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "application/json") {
		return nil, ErrInvalidTidalResponseType
	}

	body, _ := io.ReadAll(res.Body)
	if err := json.Unmarshal(body, &playback); err != nil {
		return nil, err
	}

	decoded, err := base64.StdEncoding.DecodeString(playback.Manifest)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(decoded, &manifest); err != nil {
		fmt.Println("decoded data:")
		fmt.Println(string(decoded))
		return nil, err
	}

	if len(manifest.Urls) == 0 {
		return nil, err
	}

	streamUrl := manifest.Urls[0]

	return &streamUrl, nil
}

type TidalTrackResponse struct {
	ID              int    `json:"id"`
	Duration        int    `json:"duration"`
	Title           string `json:"title"`
	ISRC            string `json:"isrc,omitempty"`
	TrackNumber     int    `json:"trackNumber,omitempty"`
	VolumeNumber    int    `json:"volumeNumber,omitempty"`
	Explicit        bool   `json:"explicit,omitempty"`
	StreamStartDate string `json:"streamStartDate,omitempty"`
	Artists         []struct {
		ID      int    `json:"id,omitempty"`
		Name    string `json:"name,omitempty"`
		Picture string `json:"picture,omitempty"`
	} `json:"artists"`
	Album struct {
		ID    int    `json:"id"`
		Title string `json:"title"`
		Cover string `json:"cover"`
	} `json:"album"`
}

func GetSong(id int64) (*types.TidalSong, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	trackUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   fmt.Sprintf("/v1/tracks/%d", id),
	}

	q := trackUrl.Query()
	q.Set("countryCode", "US")
	trackUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, trackUrl.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var trackResp TidalTrackResponse
	if err = json.Unmarshal(body, &trackResp); err != nil {
		return nil, err
	}

	song := &types.TidalSong{
		ID:              trackResp.ID,
		Duration:        trackResp.Duration,
		Title:           trackResp.Title,
		ISRC:            trackResp.ISRC,
		TrackNumber:     trackResp.TrackNumber,
		VolumeNumber:    trackResp.VolumeNumber,
		Explicit:        trackResp.Explicit,
		StreamStartDate: trackResp.StreamStartDate,
		Artists:         []types.TidalArtist{},
		Album: types.TidalAlbum{
			ID:    trackResp.Album.ID,
			Title: trackResp.Album.Title,
			Cover: trackResp.Album.Cover,
		},
	}

	for _, a := range trackResp.Artists {
		song.Artists = append(song.Artists, types.TidalArtist{
			ID:      a.ID,
			Name:    a.Name,
			Picture: a.Picture,
		})
	}

	return song, nil
}

func GetSongBatch(ids []int64) ([]types.TidalSong, error) {
	tracks := make([]types.TidalSong, len(ids))
	errs := make([]error, len(ids))
	var wg sync.WaitGroup

	for i, id := range ids {
		wg.Add(1)
		go func(idx int, trackId int64) {
			defer wg.Done()
			track, err := GetSong(trackId)
			if err != nil {
				errs[idx] = err
				return
			}
			tracks[idx] = *track
		}(i, id)
	}

	wg.Wait()

	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}

	return tracks, nil
}
