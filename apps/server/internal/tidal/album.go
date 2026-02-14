package tidal

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"

	"github.com/altierawr/oto/internal/types"
)

type TidalAlbumResponse struct {
	ID              int    `json:"id"`
	Cover           string `json:"cover,omitempty"`
	Explicit        bool   `json:"explicit,omitempty"`
	Duration        int    `json:"duration"`
	NumberOfTracks  int    `json:"numberOfTracks"`
	NumberOfVolumes int    `json:"NumberOfVolumes"`
	ReleaseDate     string `json:"releaseDate,omitempty"`
	Title           string `json:"title"`
	Type            string `json:"type"` // SINGLE, EP, ALBUM
	UPC             string `json:"upc,omitempty"`
	VibrantColor    string `json:"vibrantColor,omitempty"`
	VideoCover      string `json:"videoCover,omitempty"`
	Artists         []struct {
		ID      int    `json:"id,omitempty"`
		Name    string `json:"name,omitempty"`
		Picture string `json:"picture,omitempty"`
		Type    string `json:"type,omitempty"` // MAIN, FEATURED
	} `json:"artists"`
}

type TidalAlbumItemsResponse struct {
	TotalNumberOfItems int `json:"totalNumberOfItems"`
	Items              []struct {
		Item struct {
			ID              int    `json:"id"`
			Bpm             int    `json:"bpm,omitempty"`
			Duration        int    `json:"duration"`
			Explicit        bool   `json:"explicit,omitempty"`
			ISRC            string `json:"isrc,omitempty"`
			StreamStartDate string `json:"streamStartDate,omitempty"`
			TrackNumber     int    `json:"trackNumber,omitempty"`
			VolumeNumber    int    `json:"volumenumber,omitempty"`
			Title           string `json:"title"`
			Artists         []struct {
				ID      int    `json:"id,omitempty"`
				Name    string `json:"name,omitempty"`
				Picture string `json:"picture,omitempty"`
			} `json:"artists"`
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

func GetAlbum(id int64) (*types.TidalAlbum, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	albumUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   fmt.Sprintf("/v1/albums/%d", id),
	}

	albumQuery := albumUrl.Query()
	albumQuery.Set("countryCode", "FI")
	albumUrl.RawQuery = albumQuery.Encode()

	albumItemsUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   fmt.Sprintf("/v1/albums/%d/items", id),
	}

	itemsQuery := albumItemsUrl.Query()
	itemsQuery.Set("countryCode", "FI")
	itemsQuery.Set("locale", "en_US")
	itemsQuery.Set("limit", "100")
	itemsQuery.Set("offset", "0")
	albumItemsUrl.RawQuery = itemsQuery.Encode()

	albumReq, _ := http.NewRequest(http.MethodGet, albumUrl.String(), nil)
	albumReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))

	itemsReq, _ := http.NewRequest(http.MethodGet, albumItemsUrl.String(), nil)
	itemsReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))

	type Result struct {
		Body  []byte
		Error error
	}

	albumResultChan := make(chan Result, 1)
	itemsResultChan := make(chan Result, 1)

	go func() {
		resp, err := http.DefaultClient.Do(albumReq)
		if err != nil {
			albumResultChan <- Result{Error: err}
			return
		}

		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			albumResultChan <- Result{Error: err}
		}

		albumResultChan <- Result{Body: body}
	}()

	go func() {
		resp, err := http.DefaultClient.Do(itemsReq)
		if err != nil {
			itemsResultChan <- Result{Error: err}
			return
		}

		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			itemsResultChan <- Result{Error: err}
		}

		itemsResultChan <- Result{Body: body}
	}()

	albumResult := <-albumResultChan
	itemsResult := <-itemsResultChan

	if albumResult.Error != nil {
		return nil, albumResult.Error
	}

	if itemsResult.Error != nil {
		return nil, itemsResult.Error
	}

	var albumResponse TidalAlbumResponse
	if err = json.Unmarshal(albumResult.Body, &albumResponse); err != nil {
		return nil, err
	}

	var itemsResponse TidalAlbumItemsResponse
	if err = json.Unmarshal(itemsResult.Body, &itemsResponse); err != nil {
		return nil, err
	}

	album := types.TidalAlbum{
		ID:              albumResponse.ID,
		Cover:           albumResponse.Cover,
		Explicit:        albumResponse.Explicit,
		Duration:        albumResponse.Duration,
		NumberOfTracks:  albumResponse.NumberOfTracks,
		NumberOfVolumes: albumResponse.NumberOfVolumes,
		ReleaseDate:     albumResponse.ReleaseDate,
		Title:           albumResponse.Title,
		Type:            albumResponse.Type,
		UPC:             albumResponse.UPC,
		VibrantColor:    albumResponse.VibrantColor,
		VideoCover:      albumResponse.VideoCover,
		Songs:           []types.TidalSong{},
		Artists:         []types.TidalArtist{},
	}

	for _, item := range albumResponse.Artists {
		album.Artists = append(album.Artists, types.TidalArtist{
			ID:      item.ID,
			Name:    item.Name,
			Picture: item.Picture,
		})
	}

	for _, item := range itemsResponse.Items {
		song := types.TidalSong{
			ID:              item.Item.ID,
			Bpm:             item.Item.Bpm,
			Duration:        item.Item.Duration,
			Explicit:        item.Item.Explicit,
			ISRC:            item.Item.ISRC,
			StreamStartDate: item.Item.StreamStartDate,
			Title:           item.Item.Title,
			TrackNumber:     item.Item.TrackNumber,
			VolumeNumber:    item.Item.VolumeNumber,
			Artists:         []types.TidalArtist{},
			Album: types.TidalAlbum{
				ID:    item.Item.Album.ID,
				Title: item.Item.Album.Title,
				Cover: item.Item.Album.Cover,
			},
		}

		for _, artistItem := range item.Item.Artists {
			song.Artists = append(song.Artists, types.TidalArtist{
				ID:      artistItem.ID,
				Name:    artistItem.Name,
				Picture: artistItem.Picture,
			})
		}

		album.Songs = append(album.Songs, song)
	}

	return &album, nil
}

func GetAlbumInfoBatch(ids []int64) ([]types.TidalAlbum, error) {
	albums := make([]types.TidalAlbum, len(ids))
	errs := make([]error, len(ids))
	var wg sync.WaitGroup

	for i, id := range ids {
		wg.Add(1)
		go func(idx int, albumId int64) {
			defer wg.Done()
			album, err := GetAlbum(albumId)
			if err != nil {
				errs[idx] = err
				return
			}
			// Clear songs to keep the response lightweight
			album.Songs = nil
			albums[idx] = *album
		}(i, id)
	}

	wg.Wait()

	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}

	return albums, nil
}
