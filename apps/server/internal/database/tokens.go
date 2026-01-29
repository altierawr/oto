package database

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/altierawr/oto/internal/data"
	"github.com/google/uuid"
)

func (db *DB) RevokeToken(tokenScope, tokenPlainText string) error {
	query := `
		UPDATE tokens
		SET is_revoked = 1
		WHERE hash = $1
		RETURNING is_revoked
	`

	tokenHash := data.GetTokenHash(tokenPlainText)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	isRevoked := false
	err := db.QueryRowContext(ctx, query, tokenHash).Scan(&isRevoked)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return ErrRecordNotFound
		default:
			return err
		}
	}

	return nil
}

func (db *DB) GetTokenByHash(tokenScope, tokenPlaintext string) (*data.Token, error) {
	query := `
		SELECT hash, user_id, expiry, scope, family, is_revoked
		FROM tokens
		WHERE hash = $1
		AND scope = $2
	`

	tokenHash := data.GetTokenHash(tokenPlaintext)

	args := []any{tokenHash, tokenScope}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	token := data.Token{}
	err := db.QueryRowContext(ctx, query, args...).Scan(
		&token.Hash,
		&token.UserId,
		&token.Expiry,
		&token.Scope,
		&token.Family,
		&token.IsRevoked,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &token, nil
}

func (db *DB) IsTokenValid(tokenScope, tokenPlaintext string) (bool, error) {
	query := `
		SELECT 1
		FROM tokens
		WHERE hash = $1
		AND scope = $2
		AND expiry > $3
		AND is_revoked = 0
	`

	tokenHash := data.GetTokenHash(tokenPlaintext)

	args := []any{tokenHash, tokenScope, time.Now().Unix()}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var exists int
	err := db.QueryRowContext(ctx, query, args...).Scan(&exists)
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

func (db *DB) InsertToken(token *data.Token) error {
	query := `
		INSERT INTO tokens (hash, user_id, expiry, scope, family)
		VALUES ($1, $2, $3, $4, $5)`

	args := []any{token.Hash, token.UserId, token.Expiry, token.Scope, token.Family[:]}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, args...)
	return err
}

func (db *DB) DeleteToken(tokenPlaintext string) error {
	query := `
		DELETE FROM tokens
		WHERE hash = $1`

	tokenHash := data.GetTokenHash(tokenPlaintext)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, tokenHash)
	return err
}

func (db *DB) DeleteAllTokensForUser(scope string, userId int64) error {
	query := `
		DELETE FROM tokens
		WHERE scope = $1 AND user_id = $2`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, scope, userId)
	return err
}

func (db *DB) DeleteAllTokensForScope(scope string) error {
	query := `
		DELETE FROM tokens
		WHERE scope = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, scope)
	return err
}

func (db *DB) DeleteAllTokensForFamily(family uuid.UUID) error {
	query := `
		DELETE FROM tokens
		WHERE family = $1`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := db.ExecContext(ctx, query, family[:])
	return err
}
