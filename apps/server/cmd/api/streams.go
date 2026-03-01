package main

import (
	"bufio"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"

	"github.com/altierawr/oto/internal/database"
	"github.com/altierawr/oto/internal/tidal"
	"github.com/fsnotify/fsnotify"
	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
)

type Stream struct {
	isLoading  bool
	nrSegments int
	ffmpeg     *exec.Cmd
	trackId    int64
	seekOffset float64
}

var streams map[string]map[string]*Stream = make(map[string]map[string]*Stream)
var streamsMu sync.RWMutex

func getSessionPath(sessionId *uuid.UUID) string {
	return filepath.Join(os.TempDir(), "oto", fmt.Sprintf("session-%s", sessionId.String()))
}

func getStreamPath(sessionId *uuid.UUID, streamId string) string {
	return filepath.Join(getSessionPath(sessionId), fmt.Sprintf("stream-%s", streamId))
}

func (app *application) seekHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())

	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		app.invalidSessionResponse(w, r)
		return
	}

	streamId := params.ByName("id")
	sessionKey := sessionId.String()
	streamsMu.RLock()
	stream, exists := streams[sessionKey][streamId]
	var trackId int64
	var seekOffset float64
	if exists {
		trackId = stream.trackId
		seekOffset = stream.seekOffset
	}
	streamsMu.RUnlock()
	if streamId == "" || !exists {
		app.notFoundResponse(w, r)
		return
	}

	positionStr := r.URL.Query().Get("position")
	if positionStr == "" {
		app.badRequestResponse(w, r, errors.New("position is missing"))
		return
	}

	position, err := strconv.ParseFloat(positionStr, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	streamPath := getStreamPath(sessionId, streamId)
	playlistPath := filepath.Join(streamPath, "index.m3u8")

	playlistFile, err := os.Open(playlistPath)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer playlistFile.Close()

	segment := 0
	duration := 0.0

	offsetPosition := position - seekOffset

	if offsetPosition >= 0 {
		scanner := bufio.NewScanner(playlistFile)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())

			parts, found := strings.CutPrefix(line, "#EXTINF:")
			if found {
				durationStr := strings.Split(parts, ",")[0]

				segmentDuration, err := strconv.ParseFloat(durationStr, 64)
				if err != nil {
					app.logger.Error(err.Error(),
						"sessionId", sessionId,
						"streamId", streamId,
						"durationStr", durationStr)
					continue
				}

				duration += segmentDuration
				segment++

				if duration > offsetPosition {
					segment--
					break
				}

				if duration == offsetPosition {
					break
				}
			}
		}

	}

	// We should have the segment
	if duration > 0 && duration >= offsetPosition {
		segmentPath := filepath.Join(streamPath, fmt.Sprintf("segment-%d.mp4", segment))
		_, err = os.Stat(segmentPath)

		if err != nil {
			err = app.writeJSON(w, http.StatusOK, envelope{"segment": segment}, nil)

			if err != nil {
				app.serverErrorResponse(w, r, err)
			}

			return
		}
	}

	err = app.endStream(r, streamId)
	if err != nil {
		app.logger.Error(err.Error(),
			"sessionId", sessionId,
			"streamId", streamId)
	}

	app.startStream(w, r, trackId, strconv.FormatFloat(position, 'f', -1, 64))
}

func (app *application) endStream(r *http.Request, streamId string) error {
	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		return errors.New("session not found")
	}

	sessionKey := sessionId.String()
	streamsMu.RLock()
	stream, exists := streams[sessionKey][streamId]
	streamsMu.RUnlock()
	if streamId == "" || !exists {
		return errors.New("not found")
	}

	err := stream.ffmpeg.Process.Kill()
	if err != nil && !errors.Is(err, os.ErrProcessDone) {
		app.logger.Error(err.Error(),
			"sessionId", sessionId,
			"streamId", streamId)
	}

	streamPath := getStreamPath(sessionId, streamId)

	err = os.RemoveAll(streamPath)
	if err != nil {
		app.logger.Error(err.Error(),
			"sessionId", sessionId,
			"streamId", streamId)
	}

	streamsMu.Lock()
	if sessionStreams, found := streams[sessionKey]; found {
		delete(sessionStreams, streamId)
		if len(sessionStreams) == 0 {
			delete(streams, sessionKey)
		}
	}
	streamsMu.Unlock()

	app.logger.Info("ended stream",
		"sessionId", sessionId,
		"streamId", streamId)

	return nil
}

func (app *application) endStreamHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())
	streamId := params.ByName("id")

	err := app.endStream(r, streamId)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	err = app.writeJSON(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) serveHLSHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())

	streamId := params.ByName("id")
	if streamId == "" {
		app.notFoundResponse(w, r)
		return
	}

	segment := params.ByName("segment")
	if segment == "" {
		app.notFoundResponse(w, r)
		return
	}

	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		app.invalidSessionResponse(w, r)
		return
	}

	segmentPath := filepath.Join(getStreamPath(sessionId, streamId), segment)

	info, err := os.Stat(segmentPath)
	sessionKey := sessionId.String()
	streamsMu.RLock()
	stream, streamExists := streams[sessionKey][streamId]
	streamIsLoading := false
	streamNrSegments := -1
	if streamExists {
		streamIsLoading = stream.isLoading
		streamNrSegments = stream.nrSegments
	}
	streamsMu.RUnlock()
	if err != nil || info.IsDir() {
		if streamExists && streamIsLoading {
			app.acceptedResponse(w, r)
			return
		}

		app.notFoundResponse(w, r)
		return
	}

	w.Header().Set("Content-Type", "audio/mp4")

	if segment != "init.mp4" && streamExists && streamNrSegments != -1 {
		re := regexp.MustCompile(`\d+`)
		matches := re.FindString(segment)

		if matches != "" {
			segmentNr, err := strconv.Atoi(matches)
			if err != nil {
				app.logger.Error(err.Error(),
					"sessionId", sessionId,
					"streamId", streamId,
					"segment", segment)
			} else if streamNrSegments == segmentNr+1 {
				w.Header().Set("Access-Control-Expose-Headers", "X-Last-Segment")
				w.Header().Set("X-Last-Segment", "true")
			}
		} else {
			app.logger.Error("error parsing number from segment",
				"sessionId", sessionId,
				"streamId", streamId,
				"segment", segment)
		}
	}

	http.ServeFile(w, r, segmentPath)
}

func (app *application) startStream(w http.ResponseWriter, r *http.Request, trackId int64, ss string) {
	sessionId := app.contextGetSessionId(r)
	if sessionId == nil {
		app.invalidSessionResponse(w, r)
		return
	}

	userId := app.contextGetUserId(r)
	if userId == nil {
		app.invalidAuthenticationTokenResponse(w, r)
		return
	}

	// check that the session is valid
	_, err := app.db.GetSession(*userId, *sessionId)
	if err != nil {
		switch {
		case errors.Is(err, database.ErrRecordNotFound):
			app.invalidSessionResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}

		return
	}

	stream, err := tidal.GetSongStreamUrl(trackId)
	if err != nil {
		if errors.Is(err, tidal.ErrInvalidTidalResponseType) {
			app.logger.Error("tidal returned data in an invalid format from stream endpoint",
				"trackId", trackId)
		}

		app.serverErrorResponse(w, r, err)
		return
	}

	sessionDir := getSessionPath(sessionId)
	err = os.MkdirAll(sessionDir, os.ModePerm)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	tempDir, err := os.MkdirTemp(sessionDir, "stream-*")
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	parts := strings.Split(tempDir, "-")
	streamId := parts[len(parts)-1]

	args := []string{
		"-i", *stream,
		"-c:a", "flac",
		"-f", "hls",
		"-hls_time", "1",
		"-hls_playlist_type", "event",
		"-hls_segment_type", "fmp4",
		"-hls_segment_filename", path.Join(tempDir, "segment%d.mp4"),
	}

	if ss != "" {
		args = append([]string{"-ss", fmt.Sprintf("%ss", ss)}, args...)
	}

	args = append(args, filepath.Join(tempDir, "index.m3u8"))

	app.logger.Info("ffmpeg process started",
		"sessionId", sessionId,
		"streamId", streamId,
		"args", fmt.Sprintf("%v", args))

	cmd := exec.Command("ffmpeg", args...)

	s := Stream{
		isLoading:  true,
		nrSegments: -1,
		ffmpeg:     cmd,
		trackId:    trackId,
		seekOffset: 0,
	}

	if ss != "" {
		ssFloat, err := strconv.ParseFloat(ss, 64)
		if err != nil {
			app.badRequestResponse(w, r, err)
		}

		s.seekOffset = ssFloat
	}

	sessionKey := sessionId.String()
	streamsMu.Lock()
	if _, exists := streams[sessionKey]; !exists {
		streams[sessionKey] = make(map[string]*Stream)
	}
	streams[sessionKey][streamId] = &s
	streamsMu.Unlock()

	if err := cmd.Start(); err != nil {
		http.Error(w, "Failed to start ffmpeg", http.StatusInternalServerError)
		return
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	streamPath := getStreamPath(sessionId, streamId)
	err = watcher.Add(streamPath)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseChan := make(chan error, 1)
	var responseOnce sync.Once

	go func() {
		defer watcher.Close()

		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}

				if event.Op == fsnotify.Create && strings.HasSuffix(event.Name, "segment1.mp4") {
					app.logger.Info("segment 1 was created, notifying client",
						"sessionId", sessionId,
						"streamId", streamId)
					responseOnce.Do(func() {
						responseChan <- nil
					})
					return
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				app.logger.Error(err.Error(),
					"sessionId", sessionId,
					"streamId", streamId)
			}
		}
	}()

	// Handle ffmpeg completion in a separate goroutine
	go func() {
		cmd.Wait()

		app.logger.Info("finished downloading track",
			"sessionId", sessionId,
			"streamId", streamId,
			"trackId", fmt.Sprintf("%d", trackId),
		)

		segmentFiles, err := os.ReadDir(streamPath)
		segmentCount := -1

		// For a playlist, there are the segment files + index.m3u8 + init.mp4
		if err == nil && len(segmentFiles) > 2 {
			segmentCount = len(segmentFiles) - 2
		} else if err != nil {
			app.logger.Error("error reading stream dir",
				"sessionId", sessionId,
				"streamId", streamId,
				"error", err.Error(),
			)
		}

		streamsMu.Lock()
		if sessionStreams, found := streams[sessionKey]; found {
			if s, exists := sessionStreams[streamId]; exists {
				s.isLoading = false
				if segmentCount > 0 {
					s.nrSegments = segmentCount
				}
			}
		}
		streamsMu.Unlock()

		_, err = os.Stat(filepath.Join(streamPath, "segment0.mp4"))
		if err == nil {
			responseOnce.Do(func() {
				app.logger.Info("ffmpeg finished, sending nil",
					"sessionId", sessionId,
					"streamId", streamId,
				)
				responseChan <- nil
			})
		} else {
			responseOnce.Do(func() {
				app.logger.Info("ffmpeg finished without any segments, sending error",
					"sessionId", sessionId,
					"streamId", streamId,
				)
				responseChan <- errors.New("ffmpeg didn't create any segments")
			})
		}
	}()

	err = <-responseChan
	if err != nil {
		app.serverErrorResponse(w, r, err)
	} else {
		err = app.writeJSON(w, http.StatusCreated, envelope{"streamId": streamId}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
	}
}
