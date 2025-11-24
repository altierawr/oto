package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"

	"github.com/altierawr/shidal/internal/tidal"
)

func (app *application) searchTracksHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Query string
	}

	err := app.readJSON(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"query": input.Query}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getSongStream(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	stream, err := tidal.GetSongStreamUrl(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	ss := r.URL.Query().Get("ss")

	w.Header().Set("Content-Type", "audio/mp4")
	w.Header().Set("Transfer-Encoding", "chunked")

	args := []string{
		"-i", *stream,
		"-c:a", "flac",
		"-f", "mp4",
		"-movflags", "frag_keyframe+empty_moov+default_base_moof",
		"-frag_duration", "5000000",
		"pipe:1",
	}

	if ss != "" {
		args = append([]string{"-ss", fmt.Sprintf("%ss", ss)}, args...)
	}

	fmt.Printf("%v\n", args)

	cmd := exec.Command("ffmpeg", args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		http.Error(w, "Failed to create stdout pipe", http.StatusInternalServerError)
		return
	}

	if err := cmd.Start(); err != nil {
		http.Error(w, "Failed to start ffmpeg", http.StatusInternalServerError)
		return
	}

	// Stream ffmpeg stdout to client
	if _, err := io.Copy(w, stdout); err != nil {
		log.Println("streaming error:", err)
	}

	cmd.Wait()
}

func (app *application) viewAlbumHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDParam(r)
	if err != nil || id < 1 {
		app.notFoundResponse(w, r)
		return
	}

	album, err := tidal.GetAlbum(id)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJSON(w, 200, envelope{"album": album}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
