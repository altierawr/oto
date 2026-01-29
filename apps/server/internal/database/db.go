package database

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/altierawr/oto/assets"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/jmoiron/sqlx"

	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "modernc.org/sqlite"
)

var (
	ErrRecordNotFound = errors.New("record not found")
	ErrEditConflict   = errors.New("edit conflict")
)

type DB struct {
	dsn    string
	logger *slog.Logger
	*sqlx.DB
}

const dbFileName = "data.db"

func New(logger *slog.Logger) (*DB, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := sqlx.ConnectContext(ctx, "sqlite3", fmt.Sprintf("%s?_fk=1", dbFileName))
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxIdleTime(5 * time.Minute)
	db.SetConnMaxLifetime(2 * time.Hour)

	return &DB{
		DB:     db,
		dsn:    dbFileName,
		logger: logger,
	}, nil
}

func (db *DB) MigrateUp() error {
	iofsDriver, err := iofs.New(assets.EmbeddedFiles, "migrations")
	if err != nil {
		return err
	}

	migrator, err := migrate.NewWithSourceInstance("iofs", iofsDriver, fmt.Sprintf("sqlite3://%s", dbFileName))
	if err != nil {
		return err
	}

	err = migrator.Up()

	if err == nil {
		db.logger.Info("applied up migrations")
		return nil
	}

	switch {
	case errors.Is(err, migrate.ErrNoChange):
		return nil
	default:
		return err
	}
}
