package main

import (
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/altierawr/oto/internal/database"
	"github.com/altierawr/oto/internal/tidal"
	"github.com/altierawr/oto/internal/validator"
)

func validatePlaylistName(name string) (string, *validator.Validator) {
	trimmedName := strings.TrimSpace(name)
	v := validator.New()
	nameLength := utf8.RuneCountInString(trimmedName)

	v.Check(nameLength >= 1, "name", "must contain at least 1 character")
	v.Check(nameLength <= 50, "name", "must not contain more than 50 characters")

	return trimmedName, v
}

func (app *application) createPlaylistHandler(w http.ResponseWriter, r *http.Request) {
	userID := app.contextGetUserId(r)
	if userID == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	var input struct {
		Name string `json:"name"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.handleReadJSONError(w, r, err)
		return
	}

	name, v := validatePlaylistName(input.Name)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	playlist, err := app.db.CreatePlaylist(*userID, name)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, playlist, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) renamePlaylistHandler(w http.ResponseWriter, r *http.Request) {
	userID := app.contextGetUserId(r)
	if userID == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	playlistID, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	var input struct {
		Name string `json:"name"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.handleReadJSONError(w, r, err)
		return
	}

	name, v := validatePlaylistName(input.Name)
	if !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	playlist, err := app.db.RenamePlaylist(*userID, playlistID, name)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, playlist, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getUserPlaylistsHandler(w http.ResponseWriter, r *http.Request) {
	userID := app.contextGetUserId(r)
	if userID == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	playlists, err := app.db.GetUserPlaylists(*userID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, playlists, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getPlaylistHandler(w http.ResponseWriter, r *http.Request) {
	userID := app.contextGetUserId(r)
	if userID == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	playlistID, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	playlist, err := app.db.GetUserPlaylist(*userID, playlistID)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, playlist, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deletePlaylistHandler(w http.ResponseWriter, r *http.Request) {
	userID := app.contextGetUserId(r)
	if userID == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	playlistID, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	err = app.db.DeletePlaylist(*userID, playlistID)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) addTrackToPlaylistHandler(w http.ResponseWriter, r *http.Request) {
	userID := app.contextGetUserId(r)
	if userID == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	playlistID, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	var input struct {
		TrackID int64 `json:"trackId"`
	}

	err = app.readJSON(w, r, &input)
	if err != nil {
		app.handleReadJSONError(w, r, err)
		return
	}

	if input.TrackID < 1 {
		app.badRequestResponse(w, r, errors.New("invalid track id"))
		return
	}

	track, err := tidal.GetSong(input.TrackID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if track == nil || int64(track.ID) != input.TrackID {
		app.badRequestResponse(w, r, errors.New("invalid track id"))
		return
	}

	err = app.db.AddTrackToPlaylist(*userID, playlistID, track)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		case errors.Is(err, database.ErrDuplicatePlaylistTrack):
			app.errorResponse(w, r, http.StatusConflict, "track already exists in playlist")
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) removeTrackFromPlaylistHandler(w http.ResponseWriter, r *http.Request) {
	userID := app.contextGetUserId(r)
	if userID == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	playlistID, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	trackID, err := app.readIntParam(r, "trackId")
	if err != nil || trackID < 1 {
		app.notFoundResponse(w, r)
		return
	}

	err = app.db.RemoveTrackFromPlaylist(*userID, playlistID, trackID)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) isTrackInPlaylistHandler(w http.ResponseWriter, r *http.Request) {
	userID := app.contextGetUserId(r)
	if userID == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	playlistID, err := app.readIDParam(r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	trackID, err := app.readIntParam(r, "trackId")
	if err != nil || trackID < 1 {
		app.notFoundResponse(w, r)
		return
	}

	inPlaylist, err := app.db.IsTrackInPlaylist(*userID, playlistID, trackID)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"inPlaylist": inPlaylist}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
