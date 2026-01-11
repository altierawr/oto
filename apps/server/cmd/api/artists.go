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

	page, err := app.readIntQueryOrZero(r, "page")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	tracks, err := tidal.GetArtistTopTracks(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"tracks": tracks}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) viewArtistAlbumsHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	page, err := app.readIntQueryOrZero(r, "page")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	albums, err := tidal.GetArtistAlbums(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"albums": albums}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) viewArtistSinglesAndEpsHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	page, err := app.readIntQueryOrZero(r, "page")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	albums, err := tidal.GetArtistSinglesAndEps(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"result": albums}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) viewArtistCompilationsHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	page, err := app.readIntQueryOrZero(r, "page")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	compilations, err := tidal.GetArtistCompilations(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"result": compilations}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) viewArtistAppearsOnHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	page, err := app.readIntQueryOrZero(r, "page")
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	albums, err := tidal.GetArtistAppearsOn(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"result": albums}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
