package main

import (
	"expvar"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (app *application) routes() http.Handler {
	router := httprouter.New()

	router.NotFound = http.HandlerFunc(app.notFoundResponse)
	router.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	router.HandlerFunc(http.MethodGet, "/v1/healthcheck", app.healthcheckHandler)

	router.HandlerFunc(http.MethodGet, "/v1/track/search", app.searchTracksHandler)
	router.HandlerFunc(http.MethodGet, "/v1/albums/:id", app.viewAlbumHandler)
	router.HandlerFunc(http.MethodGet, "/v1/tracks/:id/stream", app.getSongStream)
	router.HandlerFunc(http.MethodGet, "/v1/tracks/:id/streamurl", app.getSongStreamUrl)
	router.HandlerFunc(http.MethodGet, "/v1/streams/:id/segments/:segment", app.serveHLS)
	router.HandlerFunc(http.MethodGet, "/v1/streams/:id/seek", app.seek)

	router.Handler(http.MethodGet, "/debug/vars", expvar.Handler())

	return app.enableCORS(router)
}
