package data

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base32"
	"fmt"
	"time"

	"github.com/altierawr/oto/internal/validator"
	"github.com/google/uuid"
)

const (
	ScopeInvitation     = "invitation"
	ScopeAuthentication = "authentication"
)

const (
	invitationTokenLength = 12
)

type Token struct {
	PlainText string     `json:"token"`
	Hash      []byte     `json:"-"`
	UserId    *uuid.UUID `json:"-"`
	Family    uuid.UUID  `json:"-"`
	Expiry    UnixTime   `json:"expiry"`
	Scope     string     `json:"-"`
	IsRevoked bool       `json:"-"`
}

func generateInvitationToken(ttl time.Duration) (*Token, error) {
	token := &Token{
		Expiry: UnixTime{Time: time.Now().Add(ttl)},
		Family: uuid.New(),
		Scope:  ScopeInvitation,
	}

	length := invitationTokenLength

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

	if scope == ScopeInvitation {
		v.Check(len(tokenPlaintext) == invitationTokenLength, key, fmt.Sprintf("must be %d characters long", invitationTokenLength))
	}

	return nil
}

func NewInvitationToken(ttl time.Duration) (*Token, error) {
	token, err := generateInvitationToken(ttl)
	if err != nil {
		return nil, err
	}

	return token, nil
}

func GetTokenHash(token string) []byte {
	hash := sha256.Sum256([]byte(token))
	return hash[:]
}
