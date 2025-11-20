import type { Song } from "./types";
import * as mp4box from "mp4box";

export class MusicPlayer {
  #mediaSource!: MediaSource;
  #sourceBuffer!: SourceBuffer;
  #audio: HTMLAudioElement;
  #playlist: {
    song: Song;
    segments: {
      data: Uint8Array<ArrayBuffer>;
      start: number;
      end: number;
      duration: number;
    }[];
    isDataLoaded: boolean;
    abortController: AbortController | null;
    segmentIndex: number;
  }[];
  #playlistIndex: number = 0;

  constructor() {
    this.#playlist = [];
    this.#audio = new Audio();

    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("root")!.appendChild(this.#audio);

      this.#initMediaSource();
    });
  }

  async #initMediaSource() {
    this.#mediaSource = new MediaSource();

    this.#audio.src = URL.createObjectURL(this.#mediaSource);
    this.#audio.volume = 0.1;
    this.#audio.autoplay = true;

    this.#mediaSource.addEventListener("sourceopen", () => {
      const mime = "audio/mp4;codecs=flac";
      this.#sourceBuffer = this.#mediaSource.addSourceBuffer(mime);
      this.#sourceBuffer.mode = "sequence";
    });
  }

  async playSongs(songs: Song[], index: number) {
    this.#playlistIndex = index;
    this.#playlist = songs.map((s) => ({
      song: s,
      segments: [],
      isDataLoaded: false,
      abortController: null,
      segmentIndex: 0,
    }));

    this.#fetchPlaylistSong(index);

    this.#sourceBuffer.addEventListener("updateend", () => {
      this.#loadNext();
    });

    this.#audio.addEventListener("timeupdate", () => {
      this.#loadNext();
    });
  }

  async #loadNext() {
    if (this.#sourceBuffer.updating) {
      return;
    }

    let playlistEntry = this.#playlist[this.#playlistIndex];
    if (
      playlistEntry.segments.length <= playlistEntry.segmentIndex &&
      !playlistEntry.isDataLoaded
    ) {
      return;
    }

    // Switch over to the next track if we're done loading the current one
    if (
      playlistEntry.isDataLoaded &&
      playlistEntry.segments.length === playlistEntry.segmentIndex &&
      this.#playlist.length - 1 > this.#playlistIndex
    ) {
      console.log("Switching to next track");
      this.#playlistIndex++;
      playlistEntry = this.#playlist[this.#playlistIndex];
    }

    const buffer = this.#getBufferedSeconds();
    if (buffer < 10) {
      console.log("Appending segment", playlistEntry.segmentIndex);

      this.#sourceBuffer.appendBuffer(
        playlistEntry.segments[playlistEntry.segmentIndex].data,
      );

      this.#playlist[this.#playlistIndex].segmentIndex++;
    }
  }

  #getBufferedSeconds() {
    const currentTime = this.#audio.currentTime;
    const buffered = this.#audio.buffered;

    let latestEnd = 0;
    for (let i = 0; i < buffered.length; i++) {
      const end = buffered.end(i);

      if (end > latestEnd) {
        latestEnd = end;
      }
    }

    return latestEnd - currentTime;
  }

  async #fetchPlaylistSong(index: number) {
    const controller = new AbortController();
    const signal = controller.signal;

    console.log("Fetching song", this.#playlist[index].song.title);
    const resp = await fetch(
      `http://localhost:3003/v1/tracks/${this.#playlist[index].song.id}/stream`,
      { signal },
    );

    this.#playlist[index].abortController = controller;

    const reader = resp.body!.getReader();

    const mp4boxfile = mp4box.createFile();

    let offset = 0;
    let timescale = 1;

    let currentFragmentChunks: Uint8Array<ArrayBuffer>[] = [];

    mp4boxfile.onReady = (info) => {
      info.tracks.forEach((track) => {
        timescale = track.timescale;
        mp4boxfile.setExtractionOptions(track.id, null, {
          nbSamples: Infinity,
        });
        mp4boxfile.start();
      });
    };

    mp4boxfile.onSamples = (_, __, samples) => {
      if (samples.length > 0) {
        const firstSample = samples[0];
        const lastSample = samples[samples.length - 1];

        const startTime = firstSample.cts / timescale;
        const endTime = (lastSample.cts + lastSample.duration) / timescale;

        // Combine the samples into a segment
        const totalLength = currentFragmentChunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0,
        );
        const segment = new Uint8Array(totalLength);

        let pos = 0;
        for (const chunk of currentFragmentChunks) {
          segment.set(chunk, pos);
          pos += chunk.length;
        }

        this.#playlist[index].segments.push({
          data: segment,
          start: startTime,
          end: endTime,
          duration: endTime - startTime,
        });

        this.#loadNext();

        currentFragmentChunks = [];
      }
    };

    while (true) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          console.log(
            "Finished fetching song",
            this.#playlist[index].song.title,
          );
          this.#playlist[index].abortController = null;
          this.#playlist[index].isDataLoaded = true;
          mp4boxfile.flush();
          this.#loadNext();
          break;
        }

        currentFragmentChunks.push(value);

        const buffer = value.buffer as mp4box.MP4BoxBuffer;
        buffer.fileStart = offset;
        offset += buffer.byteLength;

        mp4boxfile.appendBuffer(buffer);
      } catch (err) {
        console.error(err);
        break;
      }
    }
  }
}
