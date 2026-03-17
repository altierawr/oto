package main

import (
	"net/http"
)

func (app *application) viewArtistHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	page, err := app.tidal.GetArtistPage(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, page, nil)
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

	tracks, err := app.tidal.GetArtistTopTracks(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, tracks, nil)
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

	albums, err := app.tidal.GetArtistAlbums(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, albums, nil)
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

	albums, err := app.tidal.GetArtistSinglesAndEps(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, albums, nil)
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

	compilations, err := app.tidal.GetArtistCompilations(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, compilations, nil)
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

	albums, err := app.tidal.GetArtistAppearsOn(id, page)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, albums, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
