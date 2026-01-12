package main

import (
	"errors"
	"net/http"

	"github.com/altierawr/shidal/internal/tidal"
)

func (app *application) searchHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("query")
	if query == "" {
		app.badRequestResponse(w, r, errors.New("query is missing"))
		return
	}

	result, err := tidal.Search(query)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, result, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
