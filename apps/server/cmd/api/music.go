package main

import (
	"net/http"

	"github.com/altierawr/shidal/internal/tidal"
)

func (app *application) searchTracksHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Query string
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"query": input.Query}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) viewAlbumHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	album, err := tidal.GetAlbum(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"album": album}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
