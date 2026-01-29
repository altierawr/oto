package main

import (
	"errors"
	"net/http"

	"github.com/altierawr/oto/internal/auth"
	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/validator"
)

func (app *application) enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "Origin")
		w.Header().Add("Vary", "Access-Control-Request-Method")

		origin := r.Header.Get("Origin")

		trustedOrigins := []string{"http://localhost:5173"}

		if origin != "" {
			for _, trustedOrigin := range trustedOrigins {
				if origin == trustedOrigin {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")

					if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
						w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, PUT, PATCH, DELETE")
						w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

						w.WriteHeader(http.StatusOK)
						return
					}

					break
				}
			}
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("access_token")
		if err != nil {
			switch {
			case errors.Is(err, http.ErrNoCookie):
				r = app.contextSetUserRole(r, UserRoleAnonymous)
				next.ServeHTTP(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}

			return
		}

		token := cookie.Value

		v := validator.New()

		if data.ValidateTokenPlaintext(v, "access_token", token, data.ScopeAuthentication); !v.Valid() {
			r = app.contextSetUserRole(r, UserRoleAnonymous)
			next.ServeHTTP(w, r)
			return
		}

		claims, err := app.auth.ValidateAccessToken(token)
		if err != nil {
			switch {
			case errors.Is(err, auth.ErrTokenExpired):
				r = app.contextSetUserRole(r, UserRoleAnonymous)
				next.ServeHTTP(w, r)
			case errors.Is(err, auth.ErrTokenInvalid):
				r = app.contextSetUserRole(r, UserRoleAnonymous)
				next.ServeHTTP(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}

			return
		}

		role := UserRoleUser
		if claims.IsAdmin {
			role = UserRoleAdmin
		}

		r = app.contextSetUserRole(r, role)

		next.ServeHTTP(w, r)
	})
}

func (app *application) requireAuthenticatedUser(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := app.contextGetUserRole(r)

		if role == UserRoleAnonymous {
			app.authenticationRequiredResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (app *application) requireAdminUser(next http.HandlerFunc) http.HandlerFunc {
	fn := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := app.contextGetUserRole(r)

		if role != UserRoleAdmin {
			app.notPermittedResponse(w, r)
			return
		}

		next.ServeHTTP(w, r)
	})

	return app.requireAuthenticatedUser(fn)
}
