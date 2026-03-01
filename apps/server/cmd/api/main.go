package main

import (
	"log/slog"
	"os"
	"sync"

	"github.com/altierawr/oto/internal/auth"
	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/database"
	"github.com/altierawr/oto/internal/recommendations"
	"github.com/altierawr/oto/internal/sessions"
	"github.com/altierawr/oto/internal/tidal"
	"github.com/joho/godotenv"
	"github.com/lmittmann/tint"
	"github.com/twoscott/gobble-fm/api"
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
	lastFm struct {
		apiKey string
	}
	secrets struct {
		accessToken  string
		refreshToken string
	}
	limiter struct {
		rps     float64
		burst   int
		enabled bool
	}
}

type application struct {
	config   config
	logger   *slog.Logger
	auth     auth.AuthService
	wg       sync.WaitGroup
	db       *database.DB
	lastFm   *api.Client
	recs     *recommendations.Service
	sessions *sessions.Service
}

func main() {
	logger := slog.New(tint.NewHandler(os.Stdout, &tint.Options{Level: slog.LevelDebug}))

	err := godotenv.Load()
	if err != nil {
		logger.Warn("could not load .env file")
	}

	db, err := database.New(logger)
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}
	defer db.Close()

	logger.Info("database connected")

	err = db.MigrateUp()
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

	var cfg config

	found := false
	cfg.tidal.accessToken, found = os.LookupEnv("TIDAL_ACCESS_TOKEN")
	if !found {
		logger.Error("missing env variable TIDAL_ACCESS_TOKEN")
		os.Exit(1)
	}

	cfg.tidal.refreshToken, found = os.LookupEnv("TIDAL_REFRESH_TOKEN")
	if !found {
		logger.Error("missing env variable TIDAL_ACCESS_TOKEN")
		os.Exit(1)
	}

	cfg.tidal.clientId, found = os.LookupEnv("TIDAL_CLIENT_ID")
	if !found {
		logger.Error("missing env variable TIDAL_ACCESS_TOKEN")
		os.Exit(1)
	}

	cfg.tidal.secret, found = os.LookupEnv("TIDAL_SECRET")
	if !found {
		logger.Error("missing env variable TIDAL_ACCESS_TOKEN")
		os.Exit(1)
	}

	tidal.SetTokens(cfg.tidal.accessToken, cfg.tidal.refreshToken, cfg.tidal.clientId, cfg.tidal.secret)

	cfg.secrets.accessToken, found = os.LookupEnv("ACCESS_TOKEN_SECRET")
	if !found {
		logger.Error("missing env variable TIDAL_ACCESS_TOKEN")
		os.Exit(1)
	}

	cfg.secrets.refreshToken, found = os.LookupEnv("REFRESH_TOKEN_SECRET")
	if !found {
		logger.Error("missing env variable TIDAL_ACCESS_TOKEN")
		os.Exit(1)
	}

	auth.SetTokenSecrets(cfg.secrets.accessToken, cfg.secrets.refreshToken)

	env, found := os.LookupEnv("OTO_ENV")
	if found {
		cfg.env = env
	} else {
		cfg.env = "production"
	}

	cfg.limiter.enabled = true
	cfg.limiter.rps = 6
	cfg.limiter.burst = 12

	cfg.port = 3003

	app := &application{
		logger: logger,
		config: cfg,
		db:     db,
		auth: auth.AuthService{
			DB: db,
		},
	}

	cfg.lastFm.apiKey, found = os.LookupEnv("LASTFM_API_KEY")
	if !found {
		logger.Warn("missing env variable LASTFM_API_KEY. features requiring last fm integration won't work.")
	} else {
		app.lastFm = api.NewClientKeyOnly(cfg.lastFm.apiKey)
		app.recs = recommendations.New(app.db, app.lastFm, app.logger)
		app.db.SetOnTidalTrackUpsert(app.recs.Enqueue)
		app.background(app.recs.Run)
	}

	app.sessions = sessions.New(app.db, app.logger)
	app.background(app.sessions.RunBackground)

	createdAdmin, err := createAdminUser(app)
	if err != nil {
		logger.Error(err.Error())
		os.Exit(1)
	}

	if createdAdmin {
		logger.Info("created admin user")
	}

	app.serve()
}

func createAdminUser(app *application) (bool, error) {
	admins, err := app.db.GetAdminUsers()
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

	err = app.db.InsertUser(user)

	if err != nil {
		return false, err
	}

	return true, nil
}
