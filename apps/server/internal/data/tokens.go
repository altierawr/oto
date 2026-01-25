package data

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base32"
	"errors"
	"fmt"
	"time"

	"github.com/altierawr/oto/internal/validator"
)

const (
	ScopeInvitation     = "invitation"
	ScopeAuthentication = "authentication"
)

const (
	invitationTokenLength     = 12
	authenticationTokenLength = 32
)

type Token struct {
	PlainText string   `json:"token"`
	Hash      []byte   `json:"-"`
	UserId    *int64   `json:"-"`
	Expiry    UnixTime `json:"expiry"`
	Scope     string   `json:"-"`
}

func generateToken(userId *int64, ttl time.Duration, scope string) (*Token, error) {
	token := &Token{
		UserId: userId,
		Expiry: UnixTime{time.Now().Add(ttl)},
		Scope:  scope,
	}

	length := 0
	switch scope {
	case ScopeAuthentication:
		length = authenticationTokenLength
	case ScopeInvitation:
		length = invitationTokenLength
	default:
		return nil, errors.New("Invalid scope")
	}

	// base32 encoding produces 5 bits per character
	// + 7 to round up
	byteLen := (length*5 + 7) / 8

	randomBytes := make([]byte, byteLen)

	_, err := rand.Read(randomBytes)
	if err != nil {
		return nil, err
	}

	encoded := base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(randomBytes)

	token.PlainText = encoded[:length]

	hash := sha256.Sum256([]byte(token.PlainText))
	token.Hash = hash[:]

	return token, nil
}

func ValidateTokenPlaintext(v *validator.Validator, key string, tokenPlaintext string, scope string) error {
	v.Check(tokenPlaintext != "", "token", "must be provided")

	desiredLength := 0
	switch scope {
	case ScopeAuthentication:
		desiredLength = authenticationTokenLength
	case ScopeInvitation:
		desiredLength = invitationTokenLength
	default:
		return errors.New("Invalid scope")
	}

	v.Check(len(tokenPlaintext) == desiredLength, key, fmt.Sprintf("must be %d characters long", desiredLength))

	return nil
}

type TokenModel struct {
	DB *sql.DB
}

func (m TokenModel) New(userId *int64, ttl time.Duration, scope string) (*Token, error) {
	token, err := generateToken(userId, ttl, scope)
	if err != nil {
		return nil, err
	}

	err = m.Insert(token)
	return token, err
}

func (m TokenModel) IsValid(tokenScope, tokenPlaintext string) (bool, error) {
	query := `
		SELECT 1
		FROM tokens
		WHERE hash = $1
		AND scope = $2
		AND expiry > $3
	`

	tokenHash := sha256.Sum256([]byte(tokenPlaintext))

	args := []any{tokenHash[:], tokenScope, time.Now().Unix()}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var exists int
	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&exists)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return false, ErrRecordNotFound
		default:
			return false, err
		}
	}

	return true, nil
}

func (m TokenModel) Insert(token *Token) error {
	query := `
		INSERT INTO tokens (hash, user_id, expiry, scope)
		VALUES ($1, $2, $3, $4)`

	args := []any{token.Hash, token.UserId, token.Expiry, token.Scope}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, args...)
	return err
}

func (m TokenModel) Delete(tokenPlaintext string) error {
	query := `
		DELETE FROM tokens
		WHERE hash = $1`

	tokenHash := sha256.Sum256([]byte(tokenPlaintext))

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, tokenHash[:])
	return err
}

func (m TokenModel) DeleteAllForUser(scope string, userId int64) error {
	query := `
		DELETE FROM tokens
		WHERE scope = $1 AND user_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, scope, userId)
	return err
}

func (m TokenModel) DeleteAllForScope(scope string) error {
	query := `
		DELETE FROM tokens
		WHERE scope = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, scope)
	return err
}
