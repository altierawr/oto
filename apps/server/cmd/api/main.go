package main

import (
	"errors"
	"os"
	"path/filepath"
	"sync"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/database"
	"github.com/altierawr/oto/internal/jsonlog"
	"github.com/altierawr/oto/internal/tidal"
	"github.com/joho/godotenv"
)

type config struct {
	env   string
	port  int
	tidal struct {
		accessToken  string
		refreshToken string
		clientId     string
		secret       string
	}
}

type application struct {
	config config
	logger *jsonlog.Logger
	wg     sync.WaitGroup
	models data.Models
}

func main() {
	logger := jsonlog.New(os.Stdout, jsonlog.LevelInfo)

	err := godotenv.Load()
	if err != nil {
		logger.PrintFatal(err, nil)
	}

	db, err := database.New()
	if err != nil {
		logger.PrintFatal(err, nil)
	}
	defer db.Close()

	logger.PrintInfo("database connected", nil)

	err = database.MigrateUp()
	if err != nil {
		logger.PrintFatal(err, nil)
	}

	err = os.RemoveAll(filepath.Join(os.TempDir(), "oto"))
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
		models: data.NewModels(db),
	}

	createdAdmin, err := createAdminUser(app)
	if err != nil {
		logger.PrintFatal(err, nil)
	}

	if createdAdmin {
		logger.PrintInfo("created admin user", nil)
	}

	app.serve()
}

func createAdminUser(app *application) (bool, error) {
	admins, err := app.models.Users.GetAdmins()
	if err != nil {
		return false, err
	}

	// Already have admin, don't need to create one
	if len(admins) > 0 {
		return false, nil
	}

	user := &data.User{
		Username: "admin",
		IsAdmin:  true,
	}

	err = user.Password.Set("password")
	if err != nil {
		return false, err
	}

	err = app.models.Users.Insert(user)

	if err != nil {
		return false, err
	}

	return true, nil
}
