package main

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/altierawr/oto/internal/database"
	"github.com/altierawr/oto/internal/tidal"
	"github.com/altierawr/oto/internal/types"
	"github.com/hbollon/go-edlib"
)

func (app *application) createSessionHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	session, err := app.db.CreateSession(*userId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    session.ID.String(),
		Path:     "/",
		Expires:  session.Expiry.Time,
		HttpOnly: true,
		Secure:   app.config.env != "development",
		SameSite: http.SameSiteLaxMode,
	})

	err = app.writeJSON(w, http.StatusCreated, session, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) refreshSessionHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		app.notFoundResponse(w, r)
		return
	}

	session, err := app.db.RefreshSession(*userId, *sessionId)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    session.ID.String(),
		Path:     "/",
		Expires:  session.Expiry.Time,
		HttpOnly: true,
		Secure:   app.config.env != "development",
		SameSite: http.SameSiteLaxMode,
	})

	err = app.writeJSON(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) setSessionTracksHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		app.notFoundResponse(w, r)
		return
	}

	var input struct {
		TrackIds []int64 `json:"trackIds"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.handleReadJSONError(w, r, err)
		return
	}

	tracks := []*types.TidalSong{}
	for _, id := range input.TrackIds {
		track, err := app.db.GetTidalTrack(id)
		if err != nil && !errors.Is(err, database.ErrRecordNotFound) {
			app.serverErrorResponse(w, r, err)
			return
		}

		// wasn't found in database, let's fetch it
		if err != nil {
			app.logger.Info("tidal track not found in db; fetching from tidal",
				"id", id)
			track, err = tidal.GetSong(id)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}
		}

		tracks = append(tracks, track)
	}

	err = app.db.SetSessionTracks(*userId, *sessionId, tracks)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.invalidSessionResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) addSessionTrackHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		app.notFoundResponse(w, r)
		return
	}

	var input struct {
		TrackId  *int64 `json:"trackId"`
		Position *int64 `json:"position"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.handleReadJSONError(w, r, err)
		return
	}

	if input.TrackId == nil {
		app.badRequestResponse(w, r, errors.New("trackId is missing"))
		return
	}

	if input.Position == nil {
		app.badRequestResponse(w, r, errors.New("position is missing"))
		return
	}

	track, err := app.db.GetTidalTrack(*input.TrackId)
	if err != nil && !errors.Is(err, database.ErrRecordNotFound) {
		app.serverErrorResponse(w, r, err)
		return
	}

	// wasn't found in database, let's fetch it
	if err != nil {
		app.logger.Info("tidal track not found in db; fetching from tidal",
			"id", input.TrackId)
		track, err = tidal.GetSong(*input.TrackId)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	err = app.db.AddSessionTrack(*userId, *sessionId, *track, *input.Position)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.invalidSessionResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) removeSessionTrackHandler(w http.ResponseWriter, r *http.Request) {
	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		app.notFoundResponse(w, r)
		return
	}

	var input struct {
		Position int64 `json:"position"`
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.handleReadJSONError(w, r, err)
		return
	}

	err = app.db.RemoveSessionTrack(*userId, *sessionId, input.Position)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.invalidSessionResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	err = app.writeJSON(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getSessionAutoplayTrackHandler(w http.ResponseWriter, r *http.Request) {
	if app.recs == nil {
		app.serverErrorResponse(w, r, errors.New("last fm integration is not configured"))
		return
	}

	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		app.notFoundResponse(w, r)
		return
	}

	session, err := app.db.GetSession(*userId, *sessionId)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.invalidSessionResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	if len(session.Tracks) == 0 {
		app.badRequestResponse(w, r, errors.New("no tracks in session"))
		return
	}

	sessionTrackIds := map[int64]struct{}{}
	for _, sessionTrack := range session.Tracks {
		sessionTrackIds[int64(sessionTrack.ID)] = struct{}{}
	}

	recommendationScores := map[int]*autoplayRecommendationScore{}
	missingRecommendationTrackIDs := []int64{}
	for _, sessionTrack := range session.Tracks {
		recommendations, err := app.db.GetLastfmRecommendationsForTidalTrack(int64(sessionTrack.ID))
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		if len(recommendations) == 0 {
			missingRecommendationTrackIDs = append(missingRecommendationTrackIDs, int64(sessionTrack.ID))
			continue
		}

		addAutoplayRecommendationScores(recommendationScores, recommendations)
	}

	bestResult, err := app.getBestAutoplayTrack(recommendationScores, sessionTrackIds)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if bestResult == nil {
		if len(missingRecommendationTrackIDs) > 0 {
			app.logger.Info("fetching recommendations for autoplay because local recommendations don't exist",
				"sessionId", sessionId,
				"userId", userId)
		}

		for _, trackID := range missingRecommendationTrackIDs {
			err := app.recs.SyncIfMissing(r.Context(), trackID)
			if err != nil {
				app.logger.Error("couldn't fetch missing recommendations for autoplay",
					"error", err.Error(),
					"trackId", trackID)
				continue
			}

			recommendations, err := app.db.GetLastfmRecommendationsForTidalTrack(trackID)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			addAutoplayRecommendationScores(recommendationScores, recommendations)

			bestResult, err = app.getBestAutoplayTrack(recommendationScores, sessionTrackIds)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			if bestResult != nil {
				break
			}
		}
	}

	if bestResult == nil {
		app.logger.Error("couldn't find a track to recommend",
			"sessionId", sessionId)
		app.serverErrorResponse(w, r, errors.New("couldn't find a track to recommend"))
		return
	}

	err = app.writeJSON(w, http.StatusOK, bestResult, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type autoplayRecommendationScore struct {
	LastfmTrackId int
	ArtistName    string
	Title         string
	TotalMatch    float64
}

func addAutoplayRecommendationScores(
	recommendationScores map[int]*autoplayRecommendationScore,
	recommendations []database.TidalLastfmRecommendation,
) {
	for _, recommendation := range recommendations {
		score, ok := recommendationScores[recommendation.LastfmTrack.ID]
		if !ok {
			score = &autoplayRecommendationScore{
				LastfmTrackId: recommendation.LastfmTrack.ID,
				ArtistName:    recommendation.LastfmTrack.ArtistName,
				Title:         recommendation.LastfmTrack.Title,
				TotalMatch:    0,
			}
			recommendationScores[recommendation.LastfmTrack.ID] = score
		}

		score.TotalMatch += recommendation.Match
	}
}

func (app *application) getBestAutoplayTrack(
	recommendationScores map[int]*autoplayRecommendationScore,
	sessionTrackIDs map[int64]struct{},
) (*types.TidalSong, error) {
	if len(recommendationScores) == 0 {
		return nil, nil
	}

	scores := []*autoplayRecommendationScore{}
	for _, score := range recommendationScores {
		scores = append(scores, score)
	}

	sort.Slice(scores, func(i int, j int) bool {
		if scores[i].TotalMatch == scores[j].TotalMatch {
			return scores[i].LastfmTrackId < scores[j].LastfmTrackId
		}

		return scores[i].TotalMatch > scores[j].TotalMatch
	})

	for _, score := range scores {
		if score.ArtistName == "" || score.Title == "" {
			continue
		}

		dbTrack, err := app.db.GetTidalTrackByArtistAndTitle(score.ArtistName, score.Title)
		if err == nil {
			// if the track already exists in the session we don't want to recommend it
			if _, exists := sessionTrackIDs[int64(dbTrack.ID)]; !exists {
				return dbTrack, nil
			}

			continue
		}

		if !errors.Is(err, database.ErrRecordNotFound) {
			return nil, err
		}

		track, err := app.findTidalTrackForRecommendation(score.ArtistName, score.Title, sessionTrackIDs)
		if err != nil {
			return nil, err
		}

		if track != nil {
			return track, nil
		}
	}

	return nil, nil
}

func (app *application) findTidalTrackForRecommendation(
	artistName string,
	title string,
	sessionTrackIDs map[int64]struct{},
) (*types.TidalSong, error) {
	results, err := tidal.Search(fmt.Sprintf("%s - %s", artistName, title))
	if err != nil {
		app.logger.Error("error searching tidal for lastfm hit",
			"error", err.Error(),
			"artist", artistName,
			"title", title,
		)
		return nil, nil
	}

	var fallback *types.TidalSong
	var maxFallbackScore float32 = 0.0
	for _, result := range results.Songs {
		if _, exists := sessionTrackIDs[int64(result.ID)]; exists {
			continue
		}

		candidate := result

		if len(candidate.Artists) == 0 {
			continue
		}

		score, err := edlib.StringsSimilarity(artistName, result.Artists[0].Name, edlib.JaroWinkler)
		if score > 0.85 && score > maxFallbackScore && fallback == nil {
			maxFallbackScore = score
			fallback = &candidate
		}

		if strings.EqualFold(candidate.Artists[0].Name, artistName) && strings.EqualFold(candidate.Title, title) {
			err = app.db.InsertTidalTrack(&candidate, nil)
			if err != nil {
				app.logger.Error("error inserting tidal track for recommendation",
					"error", err.Error(),
					"trackId", candidate.ID)
			}
			return &candidate, nil
		}
	}

	if fallback != nil {
		err = app.db.InsertTidalTrack(fallback, nil)
		if err != nil {
			app.logger.Error("error inserting fallback tidal track for recommendation",
				"error", err.Error(),
				"trackId", fallback.ID)
		}
	}

	return fallback, nil
}
