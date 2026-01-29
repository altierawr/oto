package data

import (
	"errors"
	"unicode/utf8"

	"github.com/alexedwards/argon2id"
	"github.com/altierawr/oto/internal/validator"
	"github.com/google/uuid"
)

var ErrDuplicateUsername = errors.New("duplicate username")

var AnonymousUser = &User{}

type User struct {
	ID        uuid.UUID `json:"id"`
	CreatedAt UnixTime  `json:"createdAt"`
	Username  string    `json:"username"`
	Password  password  `json:"-"`
	IsAdmin   bool      `json:"isAdmin"`
	Version   int       `json:"-"`
}

func (u *User) IsAnonymous() bool {
	return u == AnonymousUser
}

type password struct {
	Plaintext *string
	Hash      *string
}

func (p *password) Set(plaintextPassword string) error {
	hash, err := argon2id.CreateHash(plaintextPassword, argon2id.DefaultParams)
	if err != nil {
		return err
	}

	p.Plaintext = &plaintextPassword
	p.Hash = &hash

	return nil
}

func (p *password) Matches(plaintextPassword string) (bool, error) {
	match, err := argon2id.ComparePasswordAndHash(plaintextPassword, *p.Hash)
	if err != nil {
		return false, err
	}

	return match, nil
}

func ValidateUsername(v *validator.Validator, username string) {
	v.Check(username != "", "username", "must be provided")
	v.Check(len(username) >= 3, "username", "must be at least 3 bytes long")
	v.Check(len(username) <= 16, "username", "must not be more than 16 bytes long")
}

func ValidatePasswordPlaintext(v *validator.Validator, password string) {
	v.Check(password != "", "password", "must be provided")
	v.Check(utf8.RuneCountInString(password) >= 8, "password", "must be at least 8 characters long")
	v.Check(utf8.RuneCountInString(password) <= 72, "password", "must not be more than 72 characters long")
}

func ValidateUser(v *validator.Validator, user *User) {
	ValidateUsername(v, user.Username)

	if user.Password.Plaintext != nil {
		ValidatePasswordPlaintext(v, *user.Password.Plaintext)
	}

	// this should never happen
	if user.Password.Hash == nil {
		panic("missing password hash for user")
	}
}
