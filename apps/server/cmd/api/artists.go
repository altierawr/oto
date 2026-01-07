package main

import (
	"net/http"

	"github.com/altierawr/shidal/internal/tidal"
)

func (app *application) viewArtistHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	artist, err := tidal.GetArtist(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"artist": artist}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) viewArtistTopTracksHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	tracks, err := tidal.GetArtistTopTracks(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"tracks": tracks}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
