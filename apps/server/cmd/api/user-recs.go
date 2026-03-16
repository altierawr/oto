package main

import (
	"net/http"

	"github.com/altierawr/oto/internal/types"
)

func (app *application) getUserTopTracksHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	tracks, err := app.db.GetUserTopPlayedTracks(*userId, 7.0)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, tracks, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getUserRecommendedTracksHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	tracks, err := app.db.GetUserRecommendedTracks(*userId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, tracks, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getUserRecommendedAlbumsHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	albums, err := app.db.GetUserRecommendedAlbums(*userId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	albumRecommendationsById := map[int][]types.TidalAlbum{}
	albumsById := map[int]types.TidalAlbum{}
	for _, album := range albums {
		if _, ok := albumRecommendationsById[album.RecommendedFromAlbum.ID]; !ok {
			albumRecommendationsById[album.RecommendedFromAlbum.ID] = []types.TidalAlbum{}
			albumsById[album.RecommendedFromAlbum.ID] = album.RecommendedFromAlbum
		}

		albumRecommendationsById[album.RecommendedFromAlbum.ID] = append(albumRecommendationsById[album.RecommendedFromAlbum.ID], album.Album)
	}

	type ResponseAlbum struct {
		RecommendedFromAlbum types.TidalAlbum   `json:"recommendedFromAlbum"`
		Albums               []types.TidalAlbum `json:"albums"`
	}

	albumsByRecommended := []ResponseAlbum{}
	for key := range albumRecommendationsById {
		albumsByRecommended = append(albumsByRecommended, ResponseAlbum{
			RecommendedFromAlbum: albumsById[key],
			Albums:               albumRecommendationsById[key],
		})
	}

	err = app.writeJSON(w, http.StatusOK, albumsByRecommended, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
