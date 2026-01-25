package main

import (
	"net/http"

	"github.com/altierawr/oto/internal/tidal"
)

func (app *application) getSongStreamUrlHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	stream, err := tidal.GetSongStreamUrl(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusOK, envelope{"stream": *stream}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getSongStreamHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	ss := r.URL.Query().Get("ss")

	app.startStream(w, r, id, ss)
}
