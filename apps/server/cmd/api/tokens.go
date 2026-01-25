package main

import (
	"net/http"
	"time"

	"github.com/altierawr/oto/internal/data"
)

func (app *application) createInviteTokenHandler(w http.ResponseWriter, r *http.Request) {
	token, err := app.models.Tokens.New(nil, 24*time.Hour, data.ScopeInvitation)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"token": token}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
