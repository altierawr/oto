package database

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/altierawr/oto/internal/data"
	"github.com/google/uuid"
)

var (
	ErrDuplicateUsername = errors.New("duplicate username")
)

func (db *DB) InsertUser(user *data.User) error {
	query := `
		INSERT INTO users (id, username, password_hash, is_admin)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, version`

	args := []any{uuid.New(), user.Username, user.Password.Hash, user.IsAdmin}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := db.QueryRowContext(ctx, query, args...).Scan(&user.ID, &user.CreatedAt, &user.Version)
	if err != nil {
		switch {
		case strings.HasPrefix(err.Error(), "constraint failed: UNIQUE constraint failed: users.username"):
			return ErrDuplicateUsername
		default:
			return err
		}
	}

	return nil
}

func (db *DB) GetAdminUsers() ([]data.User, error) {
	query := `
		SELECT id, created_at, username, is_admin, version
		FROM users
		WHERE is_admin = 1
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	users := []data.User{}

	for rows.Next() {
		var user data.User

		err := rows.Scan(
			&user.ID,
			&user.CreatedAt,
			&user.Username,
			&user.IsAdmin,
			&user.Version,
		)

		if err != nil {
			return nil, err
		}

		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

func (db *DB) GetUserById(id uuid.UUID) (*data.User, error) {
	query := `
		SELECT id, created_at, username, password_hash, is_admin, version
		FROM users
		WHERE id = $1`

	var user data.User

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Username,
		&user.Password.Hash,
		&user.IsAdmin,
		&user.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &user, nil
}

func (db *DB) GetUserByUsername(username string) (*data.User, error) {
	query := `
		SELECT id, created_at, username, password_hash, is_admin, version
		FROM users
		WHERE username = $1`

	var user data.User

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := db.QueryRowContext(ctx, query, username).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Username,
		&user.Password.Hash,
		&user.IsAdmin,
		&user.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &user, nil
}

func (db *DB) UpdateUser(user *data.User) error {
	query := `
		UPDATE users
		SET username = $1, password_hash = $2, is_admin = $3, version = version + 1
		WHERE id = $4 AND version = $5
		RETURNING version`

	args := []any{
		user.Username,
		user.Password.Hash,
		user.IsAdmin,
		user.ID,
		user.Version,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := db.QueryRowContext(ctx, query, args...).Scan(&user.Version)
	if err != nil {
		switch {
		case strings.HasPrefix(err.Error(), "constraint failed: UNIQUE constraint failed: users.username"):
			return ErrDuplicateUsername
		case errors.Is(err, sql.ErrNoRows):
			return ErrEditConflict
		default:
			return err
		}
	}

	return nil
}

func (db *DB) GetUserForToken(tokenScope, tokenPlaintext string) (*data.User, error) {
	query := `
		SELECT users.id, users.created_at, users.username, users.password_hash, users.is_admin, users.version
		FROM users
		INNER JOIN tokens
		ON users.id = tokens.user_id
		WHERE tokens.hash = $1
		AND tokens.scope = $2
		AND tokens.expiry > $3`

	tokenHash := data.GetTokenHash(tokenPlaintext)

	args := []any{tokenHash, tokenScope, time.Now().Unix()}

	var user data.User

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := db.QueryRowContext(ctx, query, args...).Scan(
		&user.ID,
		&user.CreatedAt,
		&user.Username,
		&user.Password.Hash,
		&user.IsAdmin,
		&user.Version,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &user, nil
}
