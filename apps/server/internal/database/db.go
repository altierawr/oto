package database

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
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
	dsn                string
	logger             *slog.Logger
	onTidalTrackUpsert func(trackID int64)
	*sqlx.DB
}

func (db *DB) SetOnTidalTrackUpsert(fn func(trackID int64)) {
	db.onTidalTrackUpsert = fn
}

func ensureDBPath() (string, error) {
	var baseDir string

	switch runtime.GOOS {
	case "windows":
		baseDir = os.Getenv("APPDATA")
		if baseDir == "" {
			baseDir = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Roaming")
		}
	case "darwin":
		baseDir = filepath.Join(os.Getenv("HOME"), "Library", "Application Support")
	default: // linux, bsd, etc.
		baseDir = os.Getenv("XDG_DATA_HOME")
		if baseDir == "" {
			baseDir = filepath.Join(os.Getenv("HOME"), ".local", "share")
		}
	}

	appDir := filepath.Join(baseDir, "oto")

	// Create directory if it doesn't exist
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "", err
	}

	return filepath.Join(appDir, "data.db"), nil
}

func New(logger *slog.Logger) (*DB, error) {
	dbPath, err := ensureDBPath()
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	db, err := sqlx.ConnectContext(
		ctx,
		"sqlite3",
		fmt.Sprintf("%s?_fk=1&_busy_timeout=10000&_journal_mode=WAL", dbPath),
	)
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxIdleTime(5 * time.Minute)
	db.SetConnMaxLifetime(2 * time.Hour)

	return &DB{
		DB:     db,
		dsn:    dbPath,
		logger: logger,
	}, nil
}

func (db *DB) MigrateUp() error {
	dbPath, err := ensureDBPath()
	if err != nil {
		return err
	}

	iofsDriver, err := iofs.New(assets.EmbeddedFiles, "migrations")
	if err != nil {
		return err
	}

	migrator, err := migrate.NewWithSourceInstance("iofs", iofsDriver, fmt.Sprintf("sqlite3://%s", dbPath))
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
