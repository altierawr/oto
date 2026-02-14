package main

import (
	"net/http"

	"github.com/altierawr/oto/internal/tidal"
)

func (app *application) toggleFavoriteArtistHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	var input struct {
		ID int64 `json:"id"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	isFavorited, err := app.db.IsFavoriteArtist(*userId, input.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if isFavorited {
		err = app.db.RemoveFavoriteArtist(*userId, input.ID)
	} else {
		err = app.db.AddFavoriteArtist(*userId, input.ID)
	}

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"favorited": !isFavorited}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) toggleFavoriteAlbumHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	var input struct {
		ID int64 `json:"id"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	isFavorited, err := app.db.IsFavoriteAlbum(*userId, input.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if isFavorited {
		err = app.db.RemoveFavoriteAlbum(*userId, input.ID)
	} else {
		err = app.db.AddFavoriteAlbum(*userId, input.ID)
	}

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"favorited": !isFavorited}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) toggleFavoriteTrackHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	var input struct {
		ID int64 `json:"id"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	isFavorited, err := app.db.IsFavoriteTrack(*userId, input.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if isFavorited {
		err = app.db.RemoveFavoriteTrack(*userId, input.ID)
	} else {
		err = app.db.AddFavoriteTrack(*userId, input.ID)
	}

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"favorited": !isFavorited}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) isFavoriteArtistHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	id, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	isFavorited, err := app.db.IsFavoriteArtist(*userId, id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"favorited": isFavorited}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) isFavoriteAlbumHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	id, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	isFavorited, err := app.db.IsFavoriteAlbum(*userId, id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"favorited": isFavorited}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) isFavoriteTrackHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	id, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	isFavorited, err := app.db.IsFavoriteTrack(*userId, id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"favorited": isFavorited}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getFavoriteArtistsHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	ids, err := app.db.GetFavoriteArtistIDs(*userId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if len(ids) == 0 {
		err = app.writeJSON(w, http.StatusOK, []any{}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	artists, err := tidal.GetArtistInfoBatch(ids)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, artists, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getFavoriteAlbumsHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	ids, err := app.db.GetFavoriteAlbumIDs(*userId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if len(ids) == 0 {
		err = app.writeJSON(w, http.StatusOK, []any{}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	albums, err := tidal.GetAlbumInfoBatch(ids)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, albums, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getFavoriteTracksHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	ids, err := app.db.GetFavoriteTrackIDs(*userId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if len(ids) == 0 {
		err = app.writeJSON(w, http.StatusOK, []any{}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	tracks, err := tidal.GetSongBatch(ids)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, tracks, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
