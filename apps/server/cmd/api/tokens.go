package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/altierawr/oto/internal/auth"
	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/database"
)

func (app *application) createInviteTokenHandler(w http.ResponseWriter, r *http.Request) {
	token, err := data.NewInvitationToken(24 * time.Hour)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.db.InsertToken(token)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, http.StatusCreated, envelope{"token": token}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) refreshTokensHandler(w http.ResponseWriter, r *http.Request) {
	refreshTokenCookie, err := r.Cookie("refresh_token")
	if err != nil {
		switch {
		case errors.Is(err, http.ErrNoCookie):
			app.invalidAuthenticationTokenResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	claims, err := app.auth.ValidateRefreshToken(refreshTokenCookie.Value)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrTokenExpired):
			app.authenticationTokenExpiredResponse(w, r)
		case errors.Is(err, auth.ErrTokenInvalid):
			app.invalidAuthenticationTokenResponse(w, r)
		case errors.Is(err, auth.ErrTokenReused):
			// TODO: this should also notify the user probably
			app.logger.Warn("refresh token was reused", "userId", claims.UserId)
			app.db.DeleteAllTokensForFamily(claims.Family)
			app.invalidAuthenticationTokenResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	user, err := app.db.GetUserById(claims.UserId)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.invalidAuthenticationTokenResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	tokenPair, err := app.auth.GenerateTokenPair(user)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Revoke previous token
	err = app.db.RevokeToken(data.ScopeAuthentication, refreshTokenCookie.Value)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.logger.Error("tried to invalidate refresh token but it doesn't exist",
				"userId", user.ID,
				"username", user.Username,
				"tokenHash", data.GetTokenHash(refreshTokenCookie.Value),
			)
			app.serverErrorResponse(w, r, err)
		default:
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	err = app.db.InsertToken(tokenPair.RefreshToken)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    tokenPair.AccessToken.PlainText,
		Path:     "/",
		Expires:  tokenPair.AccessToken.Expiry.Time,
		Secure:   app.config.env != "development",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenPair.RefreshToken.PlainText,
		Path:     "/",
		Expires:  tokenPair.RefreshToken.Expiry.Time,
		Secure:   app.config.env != "development",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	err = app.writeJSON(w, http.StatusCreated, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
