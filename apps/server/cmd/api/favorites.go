package main

import (
	"errors"
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
		artist, err := tidal.GetArtistBasicInfo(input.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		if artist == nil || int64(artist.ID) != input.ID {
			app.badRequestResponse(w, r, errors.New("invalid artist id"))
			return
		}

		err = app.db.AddFavoriteArtist(*userId, artist)
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
		album, err := tidal.GetAlbum(input.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		if album == nil || int64(album.ID) != input.ID {
			app.badRequestResponse(w, r, errors.New("invalid album id"))
			return
		}
		album.Songs = nil

		err = app.db.AddFavoriteAlbum(*userId, album)
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
		track, err := tidal.GetSong(input.ID)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		if track == nil || int64(track.ID) != input.ID {
			app.badRequestResponse(w, r, errors.New("invalid track id"))
			return
		}

		err = app.db.AddFavoriteTrack(*userId, track)
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

	artists, err := app.db.GetFavoriteArtists(*userId)
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

	albums, err := app.db.GetFavoriteAlbums(*userId)
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

	tracks, err := app.db.GetFavoriteTracks(*userId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, tracks, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
