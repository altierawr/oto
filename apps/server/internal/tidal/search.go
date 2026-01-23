package tidal

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/altierawr/oto/internal/types"
)

type TidalSearchResponse struct {
	Artists struct {
		Items []struct {
			ID      int    `json:"id"`
			Name    string `json:"name"`
			Picture string `json:"picture"`
		} `json:"items"`
	} `json:"artists"`
	Albums struct {
		Items []struct {
			ID              int    `json:"id,omitempty"`
			Cover           string `json:"cover,omitempty"`
			Duration        int    `json:"duration,omitempty"`
			Explicit        bool   `json:"explicit,omitempty"`
			NumberOfTracks  int    `json:"numberOfTracks,omitempty"`
			NumberOfVolumes int    `json:"numberOfVolumes,omitempty"`
			ReleaseDate     string `json:"releaseDate,omitempty"`
			Title           string `json:"title,omitempty"`
			Type            string `json:"type,omitempty"` // ALBUM,??
			UPC             string `json:"upc,omitempty"`
			VideoCover      string `json:"videoCover,omitempty"`
			Artists         []struct {
				ID      int    `json:"id,omitempty"`
				Name    string `json:"name,omitempty"`
				Picture string `json:"picture,omitempty"`
				Type    string `json:"type,omitempty"` // MAIN,??
			} `json:"artists"`
		} `json:"items"`
	} `json:"albums"`
	Tracks struct {
		Items []struct {
			ID       int    `json:"id,omitempty"`
			Duration int    `json:"duration,omitempty"`
			ISRC     string `json:"isrc,omitempty"`
			Title    string `json:"title,omitempty"`
			Album    struct {
				ID          int    `json:"id"`
				Title       string `json:"title"`
				Cover       string `json:"cover"`
				ReleaseDate string `json:"releaseDate"`
				VideoCover  string `json:"videoCover,omitempty"`
			} `json:"album"`
			Artists []struct {
				ID      int    `json:"id,omitempty"`
				Name    string `json:"name,omitempty"`
				Picture string `json:"picture,omitempty"`
			} `json:"artists"`
		} `json:"items"`
	} `json:"tracks"`
	Playlists struct {
		Items []struct {
			UUID                string  `json:"uuid,omitempty"`
			Created             string  `json:"created,omitempty"`
			Description         string  `json:"description,omitempty"`
			DoublePopularity    float64 `json:"doublePopularity,omitempty"`
			Duration            int     `json:"duration,omitempty"`
			LastItemAddedAt     string  `json:"lastItemAddedAt,omitempty"`
			LastUpdated         string  `json:"lastUpdated,omitempty"`
			NumberOfAudioTracks int     `json:"numberOfAudioTracks,omitempty"`
			NumberOfTracks      int     `json:"numberOfTracks,omitempty"`
			PromotedArtists     []struct {
				ID      int    `json:"id"`
				Name    string `json:"name"`
				Picture string `json:"picture"`
				Main    bool   `json:"main"`
			} `json:"promotedArtists"`
			PublicPlaylist bool   `json:"publicPlaylist"`
			Title          string `json:"title"`
			SquareImage    string `json:"squareImage"`
			Type           string `json:"type"`
		} `json:"items"`
	} `json:"playlists"`
	TopHits []struct {
		Type  string `json:"type"`
		Value any    `json:"value"`
	} `json:"topHits"`
}

func Search(query string) (*types.TidalSearch, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	if query == "" {
		return nil, errors.New("query is missing")
	}

	tidalURL := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   "/v2/search",
	}

	q := tidalURL.Query()
	q.Set("query", query)
	q.Set("limit", "100") // Max limit = 100
	q.Set("offset", "0")
	q.Set("types", "ARTISTS,ALBUMS,TRACKS,PLAYLISTS")
	q.Set("countryCode", "US")
	q.Set("deviceType", "BROWSER")
	tidalURL.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, tidalURL.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))

	resp, err := http.DefaultClient.Do(req)

	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, err
	}

	body, err := io.ReadAll(resp.Body)

	if err != nil {
		return nil, err
	}

	var tidalSearch TidalSearchResponse

	if err := json.Unmarshal(body, &tidalSearch); err != nil {
		return nil, err
	}

	result := types.TidalSearch{
		Artists:   []types.TidalArtist{},
		Albums:    []types.TidalAlbum{},
		Songs:     []types.TidalSong{},
		Playlists: []types.TidalPlaylist{},
		TopHits:   []types.TidalTopHit{},
	}

	for _, item := range tidalSearch.Artists.Items {
		if item.Picture == "" {
			continue
		}

		artist := types.TidalArtist{
			ID:      item.ID,
			Name:    item.Name,
			Picture: item.Picture,
		}

		result.Artists = append(result.Artists, artist)
	}

	for _, item := range tidalSearch.Albums.Items {
		album := types.TidalAlbum{
			ID:              item.ID,
			Cover:           item.Cover,
			Duration:        item.Duration,
			Explicit:        item.Explicit,
			NumberOfTracks:  item.NumberOfTracks,
			NumberOfVolumes: item.NumberOfVolumes,
			ReleaseDate:     item.ReleaseDate,
			Title:           item.Title,
			Type:            item.Type,
			UPC:             item.UPC,
			VideoCover:      item.VideoCover,
			Artists:         []types.TidalArtist{},
		}

		for _, artist := range item.Artists {
			artist := types.TidalArtist{
				ID:      artist.ID,
				Name:    artist.Name,
				Picture: artist.Picture,
			}

			album.Artists = append(album.Artists, artist)
		}

		result.Albums = append(result.Albums, album)
	}

	for _, item := range tidalSearch.Tracks.Items {
		song := types.TidalSong{
			ID:       item.ID,
			Title:    item.Title,
			Duration: item.Duration,
			ISRC:     item.ISRC,
			Artists:  []types.TidalArtist{},
			Album: types.TidalAlbum{
				ID:    item.Album.ID,
				Title: item.Album.Title,
				Cover: item.Album.Cover,
			},
		}

		for _, artist := range item.Artists {
			song.Artists = append(song.Artists, types.TidalArtist{
				ID:      artist.ID,
				Name:    artist.Name,
				Picture: artist.Picture,
			})
		}

		result.Songs = append(result.Songs, song)
	}

	for _, item := range tidalSearch.Playlists.Items {
		playlist := types.TidalPlaylist{
			UUID:                item.UUID,
			Created:             item.Created,
			Description:         item.Description,
			Popularity:          item.DoublePopularity,
			Duration:            item.Duration,
			LastItemAddedAt:     item.LastItemAddedAt,
			LastUpdated:         item.LastUpdated,
			NumberOfAudioTracks: item.NumberOfAudioTracks,
			NumberOfTracks:      item.NumberOfTracks,
			PromotedArtists:     []types.TidalArtist{},
			PublicPlaylist:      item.PublicPlaylist,
			Title:               item.Title,
			SquareImage:         item.SquareImage,
			Type:                item.Type,
		}

		for _, artistItem := range item.PromotedArtists {
			artist := types.TidalArtist{
				ID:      artistItem.ID,
				Name:    artistItem.Name,
				Picture: artistItem.Picture,
			}

			// Playlists sometimes include duplicate promoted artists for some reason
			found := false
			for _, a := range playlist.PromotedArtists {
				if a.ID == artist.ID {
					found = true
					break
				}
			}

			if !found {
				playlist.PromotedArtists = append(playlist.PromotedArtists, artist)
			}
		}

		result.Playlists = append(result.Playlists, playlist)
	}

	for _, item := range tidalSearch.TopHits {
		result.TopHits = append(result.TopHits, types.TidalTopHit{
			Type:  item.Type,
			Value: item.Value,
		})
	}

	return &result, nil
}
