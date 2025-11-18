package tidal

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"slices"
	"strings"
	"time"

	"github.com/altierawr/shidal/internal/types"
)

var (
	tidalClientId     = ""
	tidalSecret = ""
	tidalAccessToken  = ""
	tidalRefreshToken = ""
	tokenExpiry int64 = 0
)

type TidalAlbumResponse struct {
	TotalNumberOfItems int `json:"totalNumberOfItems"`
	Items              []struct {
		Item struct {
			ID              int    `json:"id"`
			Title           string `json:"title"`
			Duration        int    `json:"duration"`
			Explicit        bool   `json:"explicit"`
			StreamStartDate string `json:"streamStartDate,omitempty"`
			ReleaseDate     string `json:"releaseDate,omitempty"`
			TrackNumber     int    `json:"trackNumber,omitempty"`
			Cover           string `json:"cover,omitempty"`
			Artist          struct {
				ID      int    `json:"id,omitempty"`
				Name    string `json:"name,omitempty"`
				Picture string `json:"picture,omitempty"`
			} `json:"artist"`
			Album struct {
				ID           int    `json:"id"`
				Title        string `json:"title"`
				Cover        string `json:"cover"`
				VibrantColor string `json:"vibrantColor"`
				VideoCover   string `json:"videoCover"`
			} `json:"album"`
		} `json:"item"`
	} `json:"items"`
}

func SetTokens(accessToken string, refreshToken string, clientId string, secret string) {
	tidalAccessToken = accessToken
	tidalRefreshToken = refreshToken
	tidalClientId = clientId
	tidalSecret = secret
}

type TidalTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

func refreshTokens() error {
	// Check if we need to refresh
	now := time.Now().Unix()
	if (tokenExpiry - now) > 5 {
		return nil
	}

	form := url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {tidalRefreshToken},
	}

	apiUrl := &url.URL{
		Scheme: "https",
		Host:   "auth.tidal.com",
		Path:   "/v1/oauth2/token",
	}
	req, err := http.NewRequest(http.MethodPost, apiUrl.String(), strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}

	auth := base64.StdEncoding.EncodeToString([]byte(tidalClientId + ":" + tidalSecret))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		slog.Error("Tidal API error", "status", res.StatusCode, "body", string(body))
		return errors.New("tidal API error")
	}

	var token TidalTokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return err
	}
	if token.AccessToken == "" {
		return errors.New("empty access token in response")
	}

	tidalAccessToken = token.AccessToken
	tokenExpiry = time.Now().Add(time.Duration(token.ExpiresIn) * time.Second).Unix()

	return nil
}

func GetAlbum(id int64) (*types.TidalAlbum, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	albumItemsUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   fmt.Sprintf("/v1/albums/%d/items", id),
	}

	q := albumItemsUrl.Query()
	q.Set("countryCode", "US")
	q.Set("limit", "100")
	q.Set("offset", "0")
	albumItemsUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, albumItemsUrl.String(), nil)
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

	var albumResponse TidalAlbumResponse
	if err = json.Unmarshal(body, &albumResponse); err != nil {
		return nil, err
	}

	var album types.TidalAlbum
	album.Songs = []types.TidalSong{}
	album.Artists = []types.TidalArtist{}

	for _, item := range albumResponse.Items {
		song := types.TidalSong{
			ID: item.Item.ID,
			Title: item.Item.Title,
			Duration: item.Item.Duration,
			Explicit: item.Item.Explicit,
			TrackNumber: item.Item.TrackNumber,
			Year: item.Item.StreamStartDate[0:4],
			ArtistId: item.Item.Artist.ID,
			ArtistName: item.Item.Artist.Name,
			ArtistPicture: item.Item.Artist.Picture,
			AlbumId: item.Item.Album.ID,
			AlbumTitle: item.Item.Album.Title,
			AlbumCover: item.Item.Album.Cover,
		}

		artist := types.TidalArtist{
			ID: item.Item.Artist.ID,
			Name: item.Item.Artist.Name,
			Picture: item.Item.Artist.Picture,
		}

		album.ID = song.AlbumId
		album.Title = song.AlbumTitle
		album.Cover = song.AlbumCover
		album.VideoCover = item.Item.Album.VideoCover
		album.Songs = append(album.Songs, song)	

		if !slices.Contains(album.Artists, artist) {
			album.Artists = append(album.Artists, artist)
		}
	}

	return &album, nil
}
