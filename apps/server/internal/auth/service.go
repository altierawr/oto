package auth

import (
	"errors"
	"time"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/database"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var (
	accessTokenSecret  = []byte("")
	refreshTokenSecret = []byte("")
)

func SetTokenSecrets(accessTokenSecretStr, refreshTokenSecretStr string) {
	accessTokenSecret = []byte(accessTokenSecretStr)
	refreshTokenSecret = []byte(refreshTokenSecretStr)
}

const (
	accessTokenDuration  = 5 * time.Minute
	refreshTokenDuration = 7 * 24 * time.Hour
)

var (
	ErrTokenInvalid = errors.New("invalid token")
	ErrTokenExpired = errors.New("expired token")
	ErrTokenReused  = errors.New("token reused")
)

type AccessTokenClaims struct {
	UserId   uuid.UUID `json:"userId"`
	Username string    `json:"username"`
	IsAdmin  bool      `json:"isAdmin"`
	Family   uuid.UUID `json:"family"`
	jwt.RegisteredClaims
}

type RefreshTokenClaims struct {
	UserId          uuid.UUID `json:"userId"`
	AccessTokenHash []byte    `json:"-"`
	Family          uuid.UUID `json:"family"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  *data.Token `json:"accessToken"`
	RefreshToken *data.Token `json:"refreshToken"`
}

type AuthService struct {
	DB *database.DB
}

func (as AuthService) GenerateTokenPair(user *data.User) (*TokenPair, error) {
	family := uuid.New()
	accessTokenStr, err := as.GenerateAccessToken(user, family)
	if err != nil {
		return nil, err
	}

	refreshTokenStr, err := as.GenerateRefreshToken(user.ID, accessTokenStr, family)
	if err != nil {
		return nil, err
	}

	accessToken := &data.Token{
		PlainText: accessTokenStr,
		Hash:      data.GetTokenHash(accessTokenStr),
		UserId:    &user.ID,
		Family:    family,
		Expiry:    data.UnixTime{Time: time.Now().Add(accessTokenDuration)},
		Scope:     data.ScopeAuthentication,
	}

	refreshToken := &data.Token{
		PlainText: refreshTokenStr,
		Hash:      data.GetTokenHash(refreshTokenStr),
		UserId:    &user.ID,
		Family:    family,
		Expiry:    data.UnixTime{Time: time.Now().Add(refreshTokenDuration)},
		Scope:     data.ScopeAuthentication,
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (as AuthService) GenerateRefreshToken(userId uuid.UUID, accessToken string, family uuid.UUID) (string, error) {
	claims := RefreshTokenClaims{
		UserId:          userId,
		AccessTokenHash: data.GetTokenHash(accessToken),
		Family:          family,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(refreshTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "oto",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(refreshTokenSecret)

	if err != nil {
		return "", err
	}

	return tokenStr, nil
}

func (as AuthService) GenerateAccessToken(user *data.User, family uuid.UUID) (string, error) {
	claims := AccessTokenClaims{
		UserId:   user.ID,
		Username: user.Username,
		Family:   family,
		IsAdmin:  user.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(accessTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "oto",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(accessTokenSecret)

	if err != nil {
		return "", err
	}

	return tokenStr, nil
}

func (as AuthService) ValidateRefreshToken(tokenString string) (*RefreshTokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrTokenInvalid
		}

		return refreshTokenSecret, nil
	})
	if err != nil {
		switch {
		case errors.Is(err, jwt.ErrTokenExpired):
			return nil, ErrTokenExpired
		default:
			return nil, ErrTokenInvalid
		}
	}

	claims, ok := token.Claims.(*RefreshTokenClaims)
	if !ok || !token.Valid {
		return nil, ErrTokenInvalid
	}

	dbToken, err := as.DB.GetTokenByHash(data.ScopeAuthentication, tokenString)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			return nil, ErrTokenInvalid
		default:
			return nil, err
		}
	}

	if dbToken.IsRevoked {
		return claims, ErrTokenReused
	}

	return claims, nil
}

func (as AuthService) ValidateAccessToken(tokenString string) (*AccessTokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AccessTokenClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrTokenInvalid
		}

		return accessTokenSecret, nil
	})
	if err != nil {
		switch {
		case errors.Is(err, jwt.ErrTokenExpired):
			return nil, ErrTokenExpired
		default:
			return nil, ErrTokenInvalid
		}
	}

	claims, ok := token.Claims.(*AccessTokenClaims)
	if !ok || !token.Valid {
		return nil, ErrTokenInvalid
	}

	return claims, nil
}
