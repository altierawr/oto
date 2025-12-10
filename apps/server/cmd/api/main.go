package main

import (
	"errors"
	"os"
	"path/filepath"
	"sync"

	"github.com/altierawr/shidal/internal/jsonlog"
	"github.com/altierawr/shidal/internal/tidal"
	"github.com/joho/godotenv"
)

type config struct {
	env   string
	port  int
	tidal struct {
		accessToken  string
		refreshToken string
		clientId string
		secret string
	}
}

type application struct {
	config config
	logger *jsonlog.Logger
	wg     sync.WaitGroup
}

func main() {
	logger := jsonlog.New(os.Stdout, jsonlog.LevelInfo)

	err := godotenv.Load()
	if err != nil {
		logger.PrintFatal(err, nil)
	}

	err = os.RemoveAll(filepath.Join(os.TempDir(), "shidal"))
	if err != nil {
		logger.PrintError(errors.New("couldn't delete app temp directory"), map[string]string{
			"error": err.Error(),
		})
	}

	var cfg config

	cfg.tidal.accessToken = os.Getenv("TIDAL_ACCESS_TOKEN")
	cfg.tidal.refreshToken = os.Getenv("TIDAL_REFRESH_TOKEN")
	cfg.tidal.clientId = os.Getenv("TIDAL_CLIENT_ID")
	cfg.tidal.secret = os.Getenv("TIDAL_SECRET")

	tidal.SetTokens(cfg.tidal.accessToken, cfg.tidal.refreshToken, cfg.tidal.clientId, cfg.tidal.secret)

	cfg.env = "development"
	cfg.port = 3003

	app := &application{
		logger: logger,
		config: cfg,
	}

	app.serve()
}
