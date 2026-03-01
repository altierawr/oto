package main

import (
	"net/http"

	"github.com/altierawr/oto/internal/tidal"
)

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

	err = app.db.InsertTidalTracks(album.Songs, nil)
	if err != nil {
		app.logger.Error("something went wrong inserting tidal tracks in view album handler",
			"error", err.Error())
	}

	err = app.writeJSON(w, 200, album, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
