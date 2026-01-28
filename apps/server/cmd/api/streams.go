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

	"github.com/altierawr/oto/internal/tidal"
	"github.com/fsnotify/fsnotify"
	"github.com/julienschmidt/httprouter"
)

type Stream struct {
	isLoading  bool
	nrSegments int
	ffmpeg     *exec.Cmd
	trackId    int64
	seekOffset float64
}

var streams map[string]Stream = make(map[string]Stream)

func (app *application) seekHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())

	streamId := params.ByName("id")
	stream, exists := streams[streamId]
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

	streamPath := filepath.Join(os.TempDir(), "oto", fmt.Sprintf("stream-%s", streamId))
	playlistPath := filepath.Join(streamPath, "index.m3u8")

	playlistFile, err := os.Open(playlistPath)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer playlistFile.Close()

	segment := 0
	duration := 0.0

	offsetPosition := position - stream.seekOffset

	if offsetPosition >= 0 {
		scanner := bufio.NewScanner(playlistFile)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())

			parts, found := strings.CutPrefix(line, "#EXTINF:")
			if found {
				durationStr := strings.Split(parts, ",")[0]

				segmentDuration, err := strconv.ParseFloat(durationStr, 64)
				if err != nil {
					app.logger.Error(err.Error(), "durationStr", durationStr)
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
		segmentPath := filepath.Join(streamPath, "oto", fmt.Sprintf("segment-%d.mp4", segment))
		_, err = os.Stat(segmentPath)

		if err != nil {
			err = app.writeJSON(w, http.StatusOK, envelope{"segment": segment}, nil)

			if err != nil {
				app.serverErrorResponse(w, r, err)
			}

			return
		}
	}

	err = app.endStream(streamId)
	if err != nil {
		app.logger.Error(err.Error(), "streamId", streamId)
	}

	app.startStream(w, r, stream.trackId, strconv.FormatFloat(position, 'f', -1, 64))
}

func (app *application) endStream(streamId string) error {
	stream, exists := streams[streamId]
	if streamId == "" || !exists {
		return errors.New("not found")
	}

	err := stream.ffmpeg.Process.Kill()
	if err != nil && !errors.Is(err, os.ErrProcessDone) {
		app.logger.Error(err.Error())
	}

	streamPath := filepath.Join(os.TempDir(), "oto", fmt.Sprintf("stream-%s", streamId))

	err = os.RemoveAll(streamPath)
	if err != nil {
		app.logger.Error(err.Error())
	}

	delete(streams, streamId)

	app.logger.Info("ended stream", "streamId", streamId)

	return nil
}

func (app *application) endStreamHandler(w http.ResponseWriter, r *http.Request) {
	params := httprouter.ParamsFromContext(r.Context())
	streamId := params.ByName("id")

	err := app.endStream(streamId)
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

	segmentPath := filepath.Join(os.TempDir(), "oto", fmt.Sprintf("stream-%s", streamId), segment)

	info, err := os.Stat(segmentPath)
	stream, streamExists := streams[streamId]
	if err != nil || info.IsDir() {
		if streamExists && stream.isLoading {
			app.acceptedResponse(w, r)
			return
		}

		app.notFoundResponse(w, r)
		return
	}

	w.Header().Set("Content-Type", "audio/mp4")

	if segment != "init.mp4" && streamExists && stream.nrSegments != -1 {
		re := regexp.MustCompile(`\d+`)
		matches := re.FindString(segment)

		if matches != "" {
			segmentNr, err := strconv.Atoi(matches)
			if err != nil {
				app.logger.Error(err.Error(), "segment", segment)
			} else if stream.nrSegments == segmentNr+1 {
				w.Header().Set("Access-Control-Expose-Headers", "X-Last-Segment")
				w.Header().Set("X-Last-Segment", "true")
			}
		} else {
			app.logger.Error("error parsing number from segment", "segment", segment)
		}
	}

	http.ServeFile(w, r, segmentPath)
}

func (app *application) startStream(w http.ResponseWriter, r *http.Request, trackId int64, ss string) {
	stream, err := tidal.GetSongStreamUrl(trackId)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	otoDir := filepath.Join(os.TempDir(), "oto")
	err = os.MkdirAll(otoDir, os.ModePerm)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	tempDir, err := os.MkdirTemp(otoDir, "stream-*")
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

	app.logger.Info("ffmpeg process started", "args", fmt.Sprintf("%v", args))

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

	streams[streamId] = s

	if err := cmd.Start(); err != nil {
		http.Error(w, "Failed to start ffmpeg", http.StatusInternalServerError)
		return
	}

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	streamPath := filepath.Join(os.TempDir(), "oto", fmt.Sprintf("stream-%s", streamId))
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
					app.logger.Info("segment 1 was created, notifying client", "streamId", streamId)
					responseOnce.Do(func() {
						responseChan <- nil
					})
					return
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				app.logger.Error(err.Error())
			}
		}
	}()

	// Handle ffmpeg completion in a separate goroutine
	go func() {
		cmd.Wait()

		app.logger.Info("finished downloading track",
			"trackId", fmt.Sprintf("%d", trackId),
			"streamId", streamId,
		)

		s, exists := streams[streamId]
		if exists {
			s.isLoading = false

			segmentFiles, err := os.ReadDir(streamPath)

			// For a playlist, there are the segment files + index.m3u8 + init.mp4
			if err == nil && len(segmentFiles) > 2 {
				s.nrSegments = len(segmentFiles) - 2
			} else if err != nil {
				app.logger.Error("error reading stream dir",
					"error", err.Error(),
				)
			}

			streams[streamId] = s
		}

		_, err := os.Stat(filepath.Join(streamPath, "segment0.mp4"))
		if err == nil {
			responseOnce.Do(func() {
				app.logger.Info("ffmpeg finished, sending nil",
					"streamId", streamId,
				)
				responseChan <- nil
			})
		} else {
			responseOnce.Do(func() {
				app.logger.Info("ffmpeg finished without any segments, sending error",
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
