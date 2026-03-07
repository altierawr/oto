package main

import (
	"errors"
	"net/http"

	"github.com/altierawr/oto/internal/database"
)

func (app *application) scrobbleHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	var input struct {
		TrackId            int64 `json:"trackId"`
		PlayStartTimestamp int64 `json:"playStartTimestamp"`
		PlayEndTimestamp   int64 `json:"playEndTimestamp"`
		IsAutoplay         bool  `json:"isAutoplay"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.handleReadJSONError(w, r, err)
		return
	}

	err = app.db.AddTrackPlay(input.TrackId, *userId, input.IsAutoplay, input.PlayStartTimestamp, input.PlayEndTimestamp)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusCreated, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
