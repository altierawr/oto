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

	router.HandlerFunc(http.MethodGet, "/v1/me", app.getCurrentUserHandler)

	router.HandlerFunc(http.MethodPost, "/v1/users", app.registerUserHandler)
	router.HandlerFunc(http.MethodPost, "/v1/users/logout", app.logOutUserHandler)
	router.HandlerFunc(http.MethodPost, "/v1/users/change-password", app.changePasswordHandler)

	router.HandlerFunc(http.MethodPost, "/v1/tokens/authentication", app.loginHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/refresh", app.refreshTokensHandler)
	router.HandlerFunc(http.MethodPost, "/v1/tokens/invitecode", app.requireAdminUser(app.createInviteTokenHandler))

	router.HandlerFunc(http.MethodGet, "/v1/search", app.requireAuthenticatedUser(app.searchHandler))

	router.HandlerFunc(http.MethodGet, "/v1/artists/:id", app.requireAuthenticatedUser(app.viewArtistHandler))
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/toptracks", app.requireAuthenticatedUser(app.viewArtistTopTracksHandler))
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/albums", app.requireAuthenticatedUser(app.viewArtistAlbumsHandler))
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/singles-eps", app.requireAuthenticatedUser(app.viewArtistSinglesAndEpsHandler))
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/compilations", app.requireAuthenticatedUser(app.viewArtistCompilationsHandler))
	router.HandlerFunc(http.MethodGet, "/v1/artists/:id/appears-on", app.requireAuthenticatedUser(app.viewArtistAppearsOnHandler))

	router.HandlerFunc(http.MethodGet, "/v1/albums/:id", app.requireAuthenticatedUser(app.viewAlbumHandler))

	router.HandlerFunc(http.MethodGet, "/v1/tracks/:id/stream", app.requireAuthenticatedUser(app.getSongStreamHandler))
	router.HandlerFunc(http.MethodGet, "/v1/tracks/:id/streamurl", app.requireAuthenticatedUser(app.getSongStreamUrlHandler))

	router.HandlerFunc(http.MethodGet, "/v1/streams/:id/segments/:segment", app.requireAuthenticatedUser(app.serveHLSHandler))
	router.HandlerFunc(http.MethodGet, "/v1/streams/:id/seek", app.requireAuthenticatedUser(app.seekHandler))
	router.HandlerFunc(http.MethodGet, "/v1/streams/:id/end", app.requireAuthenticatedUser(app.endStreamHandler))

	router.HandlerFunc(http.MethodPost, "/v1/favorites/artists", app.requireAuthenticatedUser(app.toggleFavoriteArtistHandler))
	router.HandlerFunc(http.MethodGet, "/v1/favorites/artists", app.requireAuthenticatedUser(app.getFavoriteArtistsHandler))
	router.HandlerFunc(http.MethodGet, "/v1/favorites/artists/:id", app.requireAuthenticatedUser(app.isFavoriteArtistHandler))
	router.HandlerFunc(http.MethodPost, "/v1/favorites/albums", app.requireAuthenticatedUser(app.toggleFavoriteAlbumHandler))
	router.HandlerFunc(http.MethodGet, "/v1/favorites/albums", app.requireAuthenticatedUser(app.getFavoriteAlbumsHandler))
	router.HandlerFunc(http.MethodGet, "/v1/favorites/albums/:id", app.requireAuthenticatedUser(app.isFavoriteAlbumHandler))
	router.HandlerFunc(http.MethodPost, "/v1/favorites/tracks", app.requireAuthenticatedUser(app.toggleFavoriteTrackHandler))
	router.HandlerFunc(http.MethodGet, "/v1/favorites/tracks", app.requireAuthenticatedUser(app.getFavoriteTracksHandler))
	router.HandlerFunc(http.MethodGet, "/v1/favorites/tracks/:id", app.requireAuthenticatedUser(app.isFavoriteTrackHandler))

	router.Handler(http.MethodGet, "/debug/vars", expvar.Handler())

	return app.enableCORS(app.authenticate(router))
}
