package tidal

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var (
	tidalClientId           = ""
	tidalSecret             = ""
	tidalAccessToken        = ""
	tidalRefreshToken       = ""
	tokenExpiry       int64 = 0
)

var (
	ErrInvalidTidalResponseType = errors.New("invalid tidal response type")
)

func SetTokens(accessToken string, refreshToken string, clientId string, secret string) {
	tidalAccessToken = accessToken
	tidalRefreshToken = refreshToken
	tidalClientId = clientId
	tidalSecret = secret
}

type TidalTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

func refreshTokens() error {
	// Check if we need to refresh
	now := time.Now().Unix()
	if (tokenExpiry - now) > 5 {
		return nil
	}

	form := url.Values{
		"grant_type":    {"refresh_token"},
		"refresh_token": {tidalRefreshToken},
	}

	apiUrl := &url.URL{
		Scheme: "https",
		Host:   "auth.tidal.com",
		Path:   "/v1/oauth2/token",
	}
	req, err := http.NewRequest(http.MethodPost, apiUrl.String(), strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}

	auth := base64.StdEncoding.EncodeToString([]byte(tidalClientId + ":" + tidalSecret))
	req.Header.Set("Authorization", "Basic "+auth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		slog.Error("Tidal API error", "status", res.StatusCode, "body", string(body))
		return errors.New("tidal API error")
	}

	var token TidalTokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return err
	}
	if token.AccessToken == "" {
		return errors.New("empty access token in response")
	}

	tidalAccessToken = token.AccessToken
	tokenExpiry = time.Now().Add(time.Duration(token.ExpiresIn) * time.Second).Unix()

	return nil
}
