package main

import (
	"net/http"
)

func (app *application) getUserTopTracksHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	tracks, err := app.db.GetUserTopPlayedTracks(*userId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, tracks, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
