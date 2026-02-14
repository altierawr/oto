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

var artistPageSize = 50

type ModuleItemItem struct {
	Type string `json:"type"`
	Data any    `json:"-"`
}

type ModuleItem struct {
	ModuleID string           `json:"moduleId,omitempty"`
	Items    []ModuleItemItem `json:"items"`
}

func (m *ModuleItem) UnmarshalJSON(data []byte) error {
	type Alias struct {
		ModuleID string `json:"moduleId,omitempty"`
		Items    []struct {
			Type string          `json:"type"`
			Data json.RawMessage `json:"data"`
		} `json:"items"`
	}

	var alias Alias
	if err := json.Unmarshal(data, &alias); err != nil {
		return err
	}

	m.ModuleID = alias.ModuleID
	m.Items = make([]ModuleItemItem, 0, len(alias.Items))

	// Unmarshal items based on moduleId
	switch alias.ModuleID {
	case "ARTIST_TOP_TRACKS":
		for _, rawItem := range alias.Items {
			if rawItem.Type != "TRACK" {
				fmt.Println("top track type is wrong:", rawItem.Type)
				continue
			}

			var track TidalArtistTopTrack
			if err := json.Unmarshal(rawItem.Data, &track); err != nil {
				return err
			}
			m.Items = append(m.Items, ModuleItemItem{
				Type: rawItem.Type,
				Data: track,
			})
		}
	case "ARTIST_ALBUMS", "ARTIST_TOP_SINGLES", "ARTIST_APPEARS_ON", "ARTIST_COMPILATIONS":
		for _, rawItem := range alias.Items {
			if rawItem.Type != "ALBUM" && rawItem.Type != "EP" && rawItem.Type != "SINGLE" {
				fmt.Println("artist album type is wrong:", rawItem.Type)
				continue
			}

			var album TidalArtistAlbum
			if err := json.Unmarshal(rawItem.Data, &album); err != nil {
				return err
			}

			m.Items = append(m.Items, ModuleItemItem{
				Type: rawItem.Type,
				Data: album,
			})
		}
	case "ARTIST_SIMILAR_ARTISTS":
		for _, rawItem := range alias.Items {
			if rawItem.Type != "ARTIST" {
				fmt.Println("artist similar artist type is wrong:", rawItem.Type)
				continue
			}

			var artist TidalArtistSimilarArtist
			if err := json.Unmarshal(rawItem.Data, &artist); err != nil {
				return err
			}
			m.Items = append(m.Items, ModuleItemItem{
				Type: rawItem.Type,
				Data: artist,
			})
		}
	case "ARTIST_CREDITS":
		return nil
	default:
		fmt.Println("unknown artist module id:", alias.ModuleID)
	}

	return nil
}

type TidalArtistResponse struct {
	Header struct {
		Biography struct {
			Text string `json:"text,omitempty"`
		} `json:"biography"`
		FollowersAmount int `json:"followersAmount,omitempty"`
	} `json:"header"`
	Item struct {
		Data struct {
			ID                         int     `json:"id"`
			Name                       string  `json:"name"`
			Picture                    string  `json:"picture"`
			DoublePopularity           float32 `json:"doublePopularity"`
			SelectedAlbumCoverFallback string  `json:"selectedAlbumCoverFallback"`
			VibrantColor               string  `json:"vibrantColor,omitempty"`
		} `json:"data"`
	} `json:"item"`
	Items []ModuleItem `json:"items"`
}

type TidalArtistTopTrack struct {
	ID               int     `json:"id"`
	Bpm              int     `json:"bpm,omitempty"`
	DoublePopularity float32 `json:"doublePopularity,omitempty"`
	Duration         int     `json:"duration"`
	Explicit         bool    `json:"explicit,omitempty"`
	ISRC             string  `json:"isrc,omitempty"`
	StreamStartDate  string  `json:"streamStartDate,omitempty"`
	Title            string  `json:"title"`
	TrackNumber      int     `json:"trackNumber,omitempty"`
	VolumeNumber     int     `json:"volumenumber,omitempty"`
	Artists          []struct {
		ID      int    `json:"id,omitempty"`
		Name    string `json:"name,omitempty"`
		Picture string `json:"picture,omitempty"`
	} `json:"artists"`
	Album struct {
		ID           int    `json:"id"`
		Cover        string `json:"cover"`
		ReleaseDate  string `json:"releaseDate"`
		Title        string `json:"title"`
		VibrantColor string `json:"vibrantColor,omitempty"`
		VideoCover   string `json:"videoCover,omitempty"`
	} `json:"album"`
}

type TidalArtistAlbum struct {
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

type TidalArtistSimilarArtist struct {
	ID                         int     `json:"id"`
	DoublePopularity           float32 `json:"doublePopularity"`
	Name                       string  `json:"name"`
	Picture                    string  `json:"picture"`
	SelectedAlbumCoverFallback string  `json:"selectedAlbumCoverFallback"`
	VibrantColor               string  `json:"vibrantColor,omitempty"`
}

type TidalArtistAlbumTypeResponse struct {
	Items []struct {
		Type string `json:"type"`
		Data struct {
			ID              int    `json:"id"`
			Cover           string `json:"cover,omitempty"`
			Explicit        bool   `json:"explicit,omitempty"`
			Duration        int    `json:"duration,omitempty"`
			NumberOfTracks  int    `json:"numberOfTracks"`
			NumberOfVolumes int    `json:"NumberOfVolumes"`
			ReleaseDate     string `json:"releaseDate,omitempty"`
			Title           string `json:"title"`
			Type            string `json:"type,omitempty"` // SINGLE, EP, ALBUM
			UPC             string `json:"upc,omitempty"`
			VibrantColor    string `json:"vibrantColor,omitempty"`
			VideoCover      string `json:"videoCover,omitempty"`
			Artists         []struct {
				ID      int    `json:"id,omitempty"`
				Name    string `json:"name,omitempty"`
				Picture string `json:"picture,omitempty"`
			} `json:"artists"`
		} `json:"data"`
	} `json:"items"`
}

func GetArtistPage(id int64) (any, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	artistUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   fmt.Sprintf("/v2/artist/%d", id),
	}

	q := artistUrl.Query()
	q.Set("locale", "en_US")
	q.Set("countryCode", "US")
	q.Set("deviceType", "BROWSER")
	q.Set("platform", "WEB")
	artistUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, artistUrl.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))
	req.Header.Set("x-tidal-client-version", "2026.1.5")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var artistResp TidalArtistResponse
	if err = json.Unmarshal(body, &artistResp); err != nil {
		return nil, err
	}

	page := types.TidalArtistPage{
		ID:                         artistResp.Item.Data.ID,
		Name:                       artistResp.Item.Data.Name,
		Picture:                    artistResp.Item.Data.Picture,
		SelectedAlbumCoverFallback: artistResp.Item.Data.SelectedAlbumCoverFallback,
		Biography:                  artistResp.Header.Biography.Text,
		TopTracks:                  []types.TidalSong{},
		Albums:                     []types.TidalAlbum{},
		Compilations:               []types.TidalAlbum{},
		TopSingles:                 []types.TidalAlbum{},
		AppearsOn:                  []types.TidalAlbum{},
		SimilarArtists:             []types.TidalArtist{},
	}

	for _, item := range artistResp.Items {
		switch item.ModuleID {
		case "ARTIST_TOP_TRACKS":
			for _, topTrack := range item.Items {
				track, ok := topTrack.Data.(TidalArtistTopTrack)
				if !ok {
					fmt.Println("couldnt cast top track")
					continue
				}

				song := types.TidalSong{
					ID:              track.ID,
					Bpm:             track.Bpm,
					Duration:        track.Duration,
					Explicit:        track.Explicit,
					ISRC:            track.ISRC,
					Title:           track.Title,
					VolumeNumber:    track.VolumeNumber,
					StreamStartDate: track.StreamStartDate,
					TrackNumber:     track.TrackNumber,
					Album: types.TidalAlbum{
						ID:           track.Album.ID,
						Cover:        track.Album.Cover,
						ReleaseDate:  track.Album.ReleaseDate,
						Title:        track.Album.Title,
						VibrantColor: track.Album.VibrantColor,
						VideoCover:   track.Album.VideoCover,
					},
					Artists: []types.TidalArtist{},
				}

				for _, artist := range track.Artists {
					song.Artists = append(song.Artists, types.TidalArtist{
						ID:      artist.ID,
						Name:    artist.Name,
						Picture: artist.Picture,
					})
				}

				page.TopTracks = append(page.TopTracks, song)
			}

		case "ARTIST_ALBUMS", "ARTIST_TOP_SINGLES", "ARTIST_APPEARS_ON", "ARTIST_COMPILATIONS":
			for _, untypedAlbum := range item.Items {
				album, ok := untypedAlbum.Data.(TidalArtistAlbum)
				if !ok {
					fmt.Println("couldnt cast top track")
					continue
				}

				a := types.TidalAlbum{
					ID:              album.ID,
					Cover:           album.Cover,
					Explicit:        album.Explicit,
					Duration:        album.Duration,
					NumberOfTracks:  album.NumberOfTracks,
					NumberOfVolumes: album.NumberOfVolumes,
					ReleaseDate:     album.ReleaseDate,
					Title:           album.Title,
					Type:            album.Type,
					UPC:             album.UPC,
					VibrantColor:    album.VibrantColor,
					VideoCover:      album.VideoCover,
					Artists:         []types.TidalArtist{},
				}

				for _, artist := range album.Artists {
					a.Artists = append(a.Artists, types.TidalArtist{
						ID:      artist.ID,
						Name:    artist.Name,
						Picture: artist.Picture,
					})
				}

				switch item.ModuleID {
				case "ARTIST_ALBUMS":
					page.Albums = append(page.Albums, a)
				case "ARTIST_COMPILATIONS":
					page.Compilations = append(page.Compilations, a)
				case "ARTIST_TOP_SINGLES":
					page.TopSingles = append(page.TopSingles, a)
				case "ARTIST_APPEARS_ON":
					page.AppearsOn = append(page.AppearsOn, a)
				}
			}
		}
	}

	return page, nil
}

type TidalArtistInfoResponse struct {
	ID                         int    `json:"id"`
	Name                       string `json:"name"`
	Picture                    string `json:"picture,omitempty"`
	SelectedAlbumCoverFallback string `json:"selectedAlbumCoverFallback"`
}

func GetArtistBasicInfo(id int64) (*types.TidalArtist, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	artistUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   fmt.Sprintf("/v1/artists/%d", id),
	}

	q := artistUrl.Query()
	q.Set("countryCode", "US")
	artistUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, artistUrl.String(), nil)
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

	var artistResp TidalArtistInfoResponse
	if err = json.Unmarshal(body, &artistResp); err != nil {
		return nil, err
	}

	return &types.TidalArtist{
		ID:      artistResp.ID,
		Name:    artistResp.Name,
		Picture: artistResp.Picture,
	}, nil
}

func GetArtistInfoBatch(ids []int64) ([]types.TidalArtist, error) {
	artists := make([]types.TidalArtist, len(ids))
	errs := make([]error, len(ids))
	var wg sync.WaitGroup

	for i, id := range ids {
		wg.Add(1)
		go func(idx int, artistId int64) {
			defer wg.Done()
			artist, err := GetArtistBasicInfo(artistId)
			if err != nil {
				errs[idx] = err
				return
			}
			artists[idx] = *artist
		}(i, id)
	}

	wg.Wait()

	for _, err := range errs {
		if err != nil {
			return nil, err
		}
	}

	return artists, nil
}

type TidalArtistTopTracksResponse struct {
	Items []struct {
		Type string `json:"type"`
		Data struct {
			ID               int     `json:"id"`
			DoublePopularity float32 `json:"doublePopularity,omitempty"`
			Duration         int     `json:"duration"`
			Explicit         bool    `json:"explicit,omitempty"`
			ISRC             string  `json:"isrc,omitempty"`
			StreamStartDate  string  `json:"streamStartDate,omitempty"`
			TrackNumber      int     `json:"trackNumber,omitempty"`
			VolumeNumber     int     `json:"volumenumber,omitempty"`
			Title            string  `json:"title"`
			Artists          []struct {
				ID      int    `json:"id,omitempty"`
				Name    string `json:"name,omitempty"`
				Picture string `json:"picture,omitempty"`
			} `json:"artists"`
			Album struct {
				ID           int    `json:"id"`
				Cover        string `json:"cover"`
				ReleaseDate  string `json:"releaseDate,omitempty"`
				Title        string `json:"title"`
				VibrantColor string `json:"vibrantColor"`
				VideoCover   string `json:"videoCover"`
			} `json:"album"`
		} `json:"data"`
	} `json:"items"`
}

type ArtistTopTracksResult struct {
	Items             []types.TidalSong `json:"items"`
	MaybeHasMorePages bool              `json:"maybeHasMorePages"`
}

func GetArtistTopTracks(id int64, page int) (*ArtistTopTracksResult, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	artistUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   "/v2/artist/ARTIST_TOP_TRACKS/view-all",
	}

	q := artistUrl.Query()
	q.Set("locale", "en_US")
	q.Set("itemId", fmt.Sprintf("%d", id))
	q.Set("countryCode", "US")
	q.Set("deviceType", "BROWSER")
	q.Set("platform", "WEB")
	q.Set("limit", fmt.Sprintf("%d", artistPageSize))
	q.Set("offset", fmt.Sprintf("%d", page*artistPageSize))
	artistUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, artistUrl.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))
	req.Header.Set("x-tidal-client-version", "2026.1.5")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result TidalArtistTopTracksResponse
	if err = json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	tracks := []types.TidalSong{}

	for _, item := range result.Items {
		song := types.TidalSong{
			ID:              item.Data.ID,
			Duration:        item.Data.Duration,
			Explicit:        item.Data.Explicit,
			ISRC:            item.Data.ISRC,
			StreamStartDate: item.Data.StreamStartDate,
			Title:           item.Data.Title,
			TrackNumber:     item.Data.TrackNumber,
			VolumeNumber:    item.Data.VolumeNumber,
			Artists:         []types.TidalArtist{},
			Album: types.TidalAlbum{
				ID:          item.Data.Album.ID,
				Cover:       item.Data.Album.Cover,
				Title:       item.Data.Album.Title,
				ReleaseDate: item.Data.Album.ReleaseDate,
			},
		}

		for _, artistItem := range item.Data.Artists {
			song.Artists = append(song.Artists, types.TidalArtist{
				ID:      artistItem.ID,
				Name:    artistItem.Name,
				Picture: artistItem.Picture,
			})
		}

		tracks = append(tracks, song)
	}

	return &ArtistTopTracksResult{
		Items:             tracks,
		MaybeHasMorePages: len(tracks) == artistPageSize,
	}, nil
}

type ArtistAlbumsResult struct {
	Items             []types.TidalAlbum `json:"items"`
	MaybeHasMorePages bool               `json:"maybeHasMorePages"`
}

func GetArtistAlbums(id int64, page int) (*ArtistAlbumsResult, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	artistUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   "/v2/artist/ARTIST_ALBUMS/view-all",
	}

	q := artistUrl.Query()
	q.Set("locale", "en_US")
	q.Set("itemId", fmt.Sprintf("%d", id))
	q.Set("countryCode", "US")
	q.Set("deviceType", "BROWSER")
	q.Set("platform", "WEB")
	q.Set("limit", fmt.Sprintf("%d", artistPageSize))
	q.Set("offset", fmt.Sprintf("%d", page*artistPageSize))
	artistUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, artistUrl.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))
	req.Header.Set("x-tidal-client-version", "2026.1.5")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result TidalArtistAlbumTypeResponse
	if err = json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	albums := []types.TidalAlbum{}

	for _, item := range result.Items {
		album := types.TidalAlbum{
			ID:              item.Data.ID,
			Cover:           item.Data.Cover,
			Explicit:        item.Data.Explicit,
			Duration:        item.Data.Duration,
			NumberOfTracks:  item.Data.NumberOfTracks,
			NumberOfVolumes: item.Data.NumberOfVolumes,
			ReleaseDate:     item.Data.ReleaseDate,
			Title:           item.Data.Title,
			Type:            item.Data.Type,
			UPC:             item.Data.UPC,
			VibrantColor:    item.Data.VibrantColor,
			VideoCover:      item.Data.VideoCover,
			Artists:         []types.TidalArtist{},
		}

		for _, item := range item.Data.Artists {
			album.Artists = append(album.Artists, types.TidalArtist{
				ID:      item.ID,
				Name:    item.Name,
				Picture: item.Picture,
			})
		}

		albums = append(albums, album)
	}

	return &ArtistAlbumsResult{
		Items:             albums,
		MaybeHasMorePages: len(albums) == artistPageSize,
	}, nil
}

type ArtistSinglesAndEpsResult struct {
	Items             []types.TidalAlbum `json:"items"`
	MaybeHasMorePages bool               `json:"maybeHasMorePages"`
}

func GetArtistSinglesAndEps(id int64, page int) (*ArtistSinglesAndEpsResult, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	artistUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   "/v2/artist/ARTIST_TOP_SINGLES/view-all",
	}

	q := artistUrl.Query()
	q.Set("locale", "en_US")
	q.Set("itemId", fmt.Sprintf("%d", id))
	q.Set("countryCode", "US")
	q.Set("deviceType", "BROWSER")
	q.Set("platform", "WEB")
	q.Set("limit", fmt.Sprintf("%d", artistPageSize))
	q.Set("offset", fmt.Sprintf("%d", page*artistPageSize))
	artistUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, artistUrl.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))
	req.Header.Set("x-tidal-client-version", "2026.1.5")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result TidalArtistAlbumTypeResponse
	if err = json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	albums := []types.TidalAlbum{}

	for _, item := range result.Items {
		album := types.TidalAlbum{
			ID:              item.Data.ID,
			Cover:           item.Data.Cover,
			Explicit:        item.Data.Explicit,
			Duration:        item.Data.Duration,
			NumberOfTracks:  item.Data.NumberOfTracks,
			NumberOfVolumes: item.Data.NumberOfVolumes,
			ReleaseDate:     item.Data.ReleaseDate,
			Title:           item.Data.Title,
			Type:            item.Data.Type,
			UPC:             item.Data.UPC,
			VibrantColor:    item.Data.VibrantColor,
			VideoCover:      item.Data.VideoCover,
			Artists:         []types.TidalArtist{},
		}

		for _, item := range item.Data.Artists {
			album.Artists = append(album.Artists, types.TidalArtist{
				ID:      item.ID,
				Name:    item.Name,
				Picture: item.Picture,
			})
		}

		albums = append(albums, album)
	}

	return &ArtistSinglesAndEpsResult{
		Items:             albums,
		MaybeHasMorePages: len(albums) == artistPageSize,
	}, nil
}

type ArtistCompilationsResult struct {
	Items             []types.TidalAlbum `json:"items"`
	MaybeHasMorePages bool               `json:"maybeHasMorePages"`
}

func GetArtistCompilations(id int64, page int) (*ArtistCompilationsResult, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	artistUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   "/v2/artist/ARTIST_COMPILATIONS/view-all",
	}

	q := artistUrl.Query()
	q.Set("locale", "en_US")
	q.Set("itemId", fmt.Sprintf("%d", id))
	q.Set("countryCode", "US")
	q.Set("deviceType", "BROWSER")
	q.Set("platform", "WEB")
	q.Set("limit", fmt.Sprintf("%d", artistPageSize))
	q.Set("offset", fmt.Sprintf("%d", page*artistPageSize))
	artistUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, artistUrl.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))
	req.Header.Set("x-tidal-client-version", "2026.1.5")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result TidalArtistAlbumTypeResponse
	if err = json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	albums := []types.TidalAlbum{}

	for _, item := range result.Items {
		album := types.TidalAlbum{
			ID:              item.Data.ID,
			Cover:           item.Data.Cover,
			Explicit:        item.Data.Explicit,
			Duration:        item.Data.Duration,
			NumberOfTracks:  item.Data.NumberOfTracks,
			NumberOfVolumes: item.Data.NumberOfVolumes,
			ReleaseDate:     item.Data.ReleaseDate,
			Title:           item.Data.Title,
			Type:            item.Data.Type,
			UPC:             item.Data.UPC,
			VibrantColor:    item.Data.VibrantColor,
			VideoCover:      item.Data.VideoCover,
			Artists:         []types.TidalArtist{},
		}

		for _, item := range item.Data.Artists {
			album.Artists = append(album.Artists, types.TidalArtist{
				ID:      item.ID,
				Name:    item.Name,
				Picture: item.Picture,
			})
		}

		albums = append(albums, album)
	}

	return &ArtistCompilationsResult{
		Items:             albums,
		MaybeHasMorePages: len(albums) == artistPageSize,
	}, nil
}

type ArtistAppearsOnResult struct {
	Items             []types.TidalAlbum `json:"items"`
	MaybeHasMorePages bool               `json:"maybeHasMorePages"`
}

func GetArtistAppearsOn(id int64, page int) (*ArtistAppearsOnResult, error) {
	err := refreshTokens()
	if err != nil {
		return nil, err
	}

	artistUrl := &url.URL{
		Scheme: "https",
		Host:   "api.tidal.com",
		Path:   "/v2/artist/ARTIST_APPEARS_ON/view-all",
	}

	q := artistUrl.Query()
	q.Set("locale", "en_US")
	q.Set("itemId", fmt.Sprintf("%d", id))
	q.Set("countryCode", "US")
	q.Set("deviceType", "BROWSER")
	q.Set("platform", "WEB")
	q.Set("limit", fmt.Sprintf("%d", artistPageSize))
	q.Set("offset", fmt.Sprintf("%d", page*artistPageSize))
	artistUrl.RawQuery = q.Encode()

	req, _ := http.NewRequest(http.MethodGet, artistUrl.String(), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", tidalAccessToken))
	req.Header.Set("x-tidal-client-version", "2026.1.5")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var result TidalArtistAlbumTypeResponse
	if err = json.Unmarshal(body, &result); err != nil {
		return nil, err
	}

	albums := []types.TidalAlbum{}

	for _, item := range result.Items {
		album := types.TidalAlbum{
			ID:              item.Data.ID,
			Cover:           item.Data.Cover,
			Explicit:        item.Data.Explicit,
			Duration:        item.Data.Duration,
			NumberOfTracks:  item.Data.NumberOfTracks,
			NumberOfVolumes: item.Data.NumberOfVolumes,
			ReleaseDate:     item.Data.ReleaseDate,
			Title:           item.Data.Title,
			Type:            item.Data.Type,
			UPC:             item.Data.UPC,
			VibrantColor:    item.Data.VibrantColor,
			VideoCover:      item.Data.VideoCover,
			Artists:         []types.TidalArtist{},
		}

		for _, item := range item.Data.Artists {
			album.Artists = append(album.Artists, types.TidalArtist{
				ID:      item.ID,
				Name:    item.Name,
				Picture: item.Picture,
			})
		}

		albums = append(albums, album)
	}

	return &ArtistAppearsOnResult{
		Items:             albums,
		MaybeHasMorePages: len(albums) == artistPageSize,
	}, nil
}
