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
	router.HandlerFunc(http.MethodGet, "/v1/search", app.searchHandler)

	router.HandlerFunc(http.MethodGet, "/v1/artists/:id", app.viewArtistHandler)
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/toptracks", app.viewArtistTopTracksHandler)
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/albums", app.viewArtistAlbumsHandler)
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/singles-eps", app.viewArtistSinglesAndEpsHandler)
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/compilations", app.viewArtistCompilationsHandler)
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/appears-on", app.viewArtistAppearsOnHandler)

	router.HandlerFunc(http.MethodGet, "/v1/albums/:id", app.viewAlbumHandler)

	router.HandlerFunc(http.MethodGet, "/v1/tracks/:id/stream", app.getSongStreamHandler)
	router.HandlerFunc(http.MethodGet, "/v1/tracks/:id/streamurl", app.getSongStreamUrlHandler)

	router.HandlerFunc(http.MethodGet, "/v1/streams/:id/segments/:segment", app.serveHLSHandler)
	router.HandlerFunc(http.MethodGet, "/v1/streams/:id/seek", app.seekHandler)
	router.HandlerFunc(http.MethodGet, "/v1/streams/:id/end", app.endStreamHandler)

	router.Handler(http.MethodGet, "/debug/vars", expvar.Handler())

	return app.enableCORS(router)
}
