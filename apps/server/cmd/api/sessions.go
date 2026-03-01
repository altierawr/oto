package main

import (
	"errors"
	"fmt"
	"math"
	"net/http"
	"sort"
	"strings"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/database"
	"github.com/altierawr/oto/internal/tidal"
	"github.com/altierawr/oto/internal/types"
	"github.com/hbollon/go-edlib"
)

const (
	autoplaySeedAutoplayWeight      = 0.08
	autoplaySeedRecencyDecay        = 10.0
	autoplayDiversityWindowSize     = 20
	autoplayArtistPenaltyFactor     = 0.4
	autoplayAlbumPenaltyFactor      = 1.4
	autoplayRecommendationFindLimit = 3
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
		TrackId    *int64 `json:"trackId"`
		Position   *int64 `json:"position"`
		IsAutoplay *bool  `json:"isAutoplay"`
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

	isAutoplay := false
	if input.IsAutoplay != nil && *input.IsAutoplay {
		isAutoplay = true
	}

	err = app.db.AddSessionTrack(*userId, *sessionId, *track, *input.Position, isAutoplay)
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
	missingRecommendationTracks := []data.SessionTrack{}
	albumOccurrences := make(map[int]int, len(session.Tracks))
	sessionTrackIndices := make(map[int]int, len(session.Tracks))

	for idx, sessionTrack := range session.Tracks {
		albumOccurrences[sessionTrack.Album.ID]++
		sessionTrackIndices[sessionTrack.ID] = idx
	}

	for idx, sessionTrack := range session.Tracks {
		recommendations, err := app.db.GetLastfmRecommendationsForTidalTrack(int64(sessionTrack.ID))
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		if len(recommendations) == 0 {
			missingRecommendationTracks = append(missingRecommendationTracks, sessionTrack)
			continue
		}

		addAutoplayRecommendationScores(
			recommendationScores,
			recommendations,
			sessionTrack,
			idx,
			len(session.Tracks),
			albumOccurrences[sessionTrack.Album.ID],
		)
	}

	bestResult, err := app.getBestAutoplayTrack(recommendationScores, sessionTrackIds, session.Tracks)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if bestResult == nil {
		if len(missingRecommendationTracks) > 0 {
			app.logger.Info("fetching recommendations for autoplay because local recommendations don't exist",
				"sessionId", sessionId,
				"userId", userId)
		}

		for _, track := range missingRecommendationTracks {
			err := app.recs.SyncIfMissing(r.Context(), int64(track.ID))
			if err != nil {
				app.logger.Error("couldn't fetch missing recommendations for autoplay",
					"error", err.Error(),
					"trackId", track)
				continue
			}

			recommendations, err := app.db.GetLastfmRecommendationsForTidalTrack(int64(track.ID))
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			trackIndex, ok := sessionTrackIndices[track.ID]
			if !ok {
				continue
			}

			addAutoplayRecommendationScores(
				recommendationScores,
				recommendations,
				track,
				trackIndex,
				len(session.Tracks),
				albumOccurrences[track.Album.ID],
			)

			bestResult, err = app.getBestAutoplayTrack(recommendationScores, sessionTrackIds, session.Tracks)
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

type autoplayQueueStats struct {
	artistCounts map[string]int
	albumCounts  map[int]int
}

func addAutoplayRecommendationScores(
	recommendationScores map[int]*autoplayRecommendationScore,
	recommendations []database.TidalLastfmRecommendation,
	sessionTrack data.SessionTrack,
	index int,
	sessionLength int,
	albumOccurrences int,
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

		match := recommendation.Match * calculateAutoplaySeedWeight(sessionTrack, index, sessionLength, albumOccurrences)

		score.TotalMatch += match
	}
}

func calculateAutoplaySeedWeight(sessionTrack data.SessionTrack, index int, sessionLength int, albumOccurrences int) float64 {
	if sessionLength <= 0 {
		return 0
	}

	albumPenalty := 1.0
	autoplayPenalty := 1.0
	recencyPenalty := 1.0
	if sessionTrack.IsAutoplay {
		autoplayPenalty = autoplaySeedAutoplayWeight
		distanceFromTail := float64(sessionLength - 1 - index)
		if distanceFromTail < 0 {
			distanceFromTail = 0
		}
		recencyPenalty = math.Exp(-distanceFromTail / autoplaySeedRecencyDecay)

		if albumOccurrences > 0 {
			albumPenalty = 1.0 / float64(albumOccurrences)
		}
	}

	return albumPenalty * autoplayPenalty * recencyPenalty
}

func getTrackPrimaryArtistName(track types.TidalSong) string {
	if len(track.Artists) == 0 {
		return ""
	}

	return strings.ToLower(strings.TrimSpace(track.Artists[0].Name))
}

func buildAutoplayQueueStats(tracks []data.SessionTrack) autoplayQueueStats {
	stats := autoplayQueueStats{
		artistCounts: map[string]int{},
		albumCounts:  map[int]int{},
	}

	start := 0
	if len(tracks) > autoplayDiversityWindowSize {
		start = len(tracks) - autoplayDiversityWindowSize
	}

	for _, track := range tracks[start:] {
		artistName := getTrackPrimaryArtistName(track.TidalSong)
		if artistName != "" {
			stats.artistCounts[artistName]++
		}
		stats.albumCounts[track.Album.ID]++
	}

	return stats
}

func calculateAutoplayDiversityPenalty(track *types.TidalSong, queueStats autoplayQueueStats) float64 {
	artistPenalty := 1.0
	albumPenalty := 1.0

	artistName := getTrackPrimaryArtistName(*track)
	if artistName != "" {
		artistPenalty = 1.0 / (1.0 + autoplayArtistPenaltyFactor*float64(queueStats.artistCounts[artistName]))
	}

	albumPenalty = 1.0 / (1.0 + autoplayAlbumPenaltyFactor*float64(queueStats.albumCounts[track.Album.ID]))

	return artistPenalty * albumPenalty
}

func (app *application) getBestAutoplayTrack(
	recommendationScores map[int]*autoplayRecommendationScore,
	sessionTrackIDs map[int64]struct{},
	sessionTracks []data.SessionTrack,
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

	queueStats := buildAutoplayQueueStats(sessionTracks)
	var bestTrack *types.TidalSong
	bestAdjustedScore := 0.0
	bestRawScore := 0.0
	findAttempts := 0

	for _, score := range scores {
		if score.ArtistName == "" || score.Title == "" {
			continue
		}

		var candidateTrack *types.TidalSong
		dbTrack, err := app.db.GetTidalTrackByArtistAndTitle(score.ArtistName, score.Title)
		if err == nil {
			// if the track already exists in the session we don't want to recommend it
			if _, exists := sessionTrackIDs[int64(dbTrack.ID)]; !exists {
				candidateTrack = dbTrack
			}
		} else {
			if !errors.Is(err, database.ErrRecordNotFound) {
				return nil, err
			}

			if findAttempts >= autoplayRecommendationFindLimit {
				continue
			}

			findAttempts++
			track, err := app.findTidalTrackForRecommendation(score.ArtistName, score.Title, sessionTrackIDs)
			if err != nil {
				return nil, err
			}

			if track != nil {
				candidateTrack = track
			}
		}

		if candidateTrack == nil {
			continue
		}

		adjustedScore := score.TotalMatch * calculateAutoplayDiversityPenalty(candidateTrack, queueStats)
		if bestTrack == nil || adjustedScore > bestAdjustedScore ||
			(adjustedScore == bestAdjustedScore && score.TotalMatch > bestRawScore) {
			bestTrack = candidateTrack
			bestAdjustedScore = adjustedScore
			bestRawScore = score.TotalMatch
		}
	}

	return bestTrack, nil
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
