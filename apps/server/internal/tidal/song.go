package tidal

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

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

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

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
