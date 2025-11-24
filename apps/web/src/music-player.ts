import { usePlayerState } from "./store";
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
      isInBuffer: boolean;
    }[];
    accurateDuration: number | null;
    timestampOffset: number;
    isDataLoading: boolean;
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
    this.#audio.volume = 0.02;
    this.#audio.autoplay = true;

    this.#mediaSource.addEventListener("sourceopen", () => {
      const mime = "audio/mp4;codecs=flac";
      this.#sourceBuffer = this.#mediaSource.addSourceBuffer(mime);
      this.#sourceBuffer.mode = "segments";
      this.#sourceBuffer.timestampOffset = 0;
    });

    this.#audio.addEventListener("timeupdate", () => {
      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          currentTime: this.#audio.currentTime,
          buffer: this.#getBufferedRange(),
        },
      });

      this.#pruneBuffer();
      this.#loadNext();
    });

    this.#audio.addEventListener("progress", () => {
      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          buffer: this.#getBufferedRange(),
        },
      });
    });

    this.#audio.addEventListener("waiting", () => {
      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          isBuffering: true,
        },
      });
    });

    this.#audio.addEventListener("canplay", () => {
      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          isBuffering: false,
          buffer: this.#getBufferedRange(),
        },
      });
    });

    this.#audio.addEventListener("play", () => {
      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          isPaused: false,
          buffer: this.#getBufferedRange(),
        },
      });
    });

    this.#audio.addEventListener("pause", () => {
      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          isPaused: true,
        },
      });
    });
  }

  #getBufferedRange() {
    const buffered = this.#audio.buffered;

    const ranges = [];
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: buffered.start(i),
        end: buffered.end(i),
      });
    }

    if (ranges.length === 0) {
      return null;
    }

    return {
      from: ranges[0].start,
      to: ranges[ranges.length - 1].end,
    };
  }

  async playSongs(songs: Song[], index: number) {
    console.log("Requested playback of", songs.length, "songs");
    for (const song of this.#playlist) {
      song.abortController?.abort();
    }

    this.#playlistIndex = index;
    this.#playlist = songs.map((s) => ({
      song: s,
      segments: [],
      timestampOffset: 0,
      accurateDuration: null,
      isDataLoaded: false,
      isDataLoading: false,
      abortController: null,
      segmentIndex: 0,
    }));

    usePlayerState.setState({
      playInfo: {
        song: songs[index],
        playlist: songs,
        playlistIndex: index,
        currentTime: 0,
        buffer: null,
        isBuffering: true,
        isPaused: false,
      },
    });

    await this.#clearSourceBuffer();

    this.#sourceBuffer.addEventListener(
      "updateend",
      () => {
        this.#audio.currentTime = 0;
      },
      { once: true },
    );

    this.#loadPlaylistSong(index);
  }

  async seek(positionPerc: number) {
    const current = this.#playlist[this.#playlistIndex];
    const duration = current.accurateDuration || current.song.duration;
    const position = parseFloat((duration * positionPerc).toFixed(1));
    console.log("Seeking to", position);

    const targetSegmentIndex = current.segments.findIndex(
      (seg) => position >= seg.start && position <= seg.end,
    );

    // Found segment
    if (targetSegmentIndex !== -1) {
      const segment = current.segments[targetSegmentIndex];

      // Segment is in buffer, we can just jump to it
      if (segment.isInBuffer) {
        this.#audio.currentTime = position;
        return;
      }

      console.log("SEEKING TO UNKNOWN TERRITORY (danger)");
      current.abortController?.abort();

      this.#playlist[this.#playlistIndex].segments = [];
      this.#playlist[this.#playlistIndex].segmentIndex = 0;
      this.#playlist[this.#playlistIndex].isDataLoading = false;
      this.#playlist[this.#playlistIndex].isDataLoaded = false;
      this.#playlist[this.#playlistIndex].timestampOffset = position;

      await this.#clearSourceBuffer();

      this.#loadPlaylistSong(this.#playlistIndex, position);

      this.#sourceBuffer.addEventListener(
        "updateend",
        () => {
          this.#audio.currentTime = position;
        },
        { once: true },
      );

      return;
    }

    // Segment not found
    console.error("Segment not found when seeking");
  }

  async #clearSourceBuffer() {
    await this.#waitForBufferReady();
    const buffered = this.#sourceBuffer.buffered;
    if (buffered.length > 0) {
      this.#sourceBuffer.remove(
        buffered.start(0),
        buffered.end(buffered.length - 1),
      );
      await this.#waitForBufferReady();
    }
  }

  async #waitForBufferReady() {
    return new Promise<void>((resolve) => {
      if (!this.#sourceBuffer.updating) return resolve();
      this.#sourceBuffer.addEventListener(
        "updateend",
        () => {
          resolve();
        },
        { once: true },
      );
    });
  }

  async #pruneBuffer() {
    const currentTime = this.#audio.currentTime;
    if (!this.#sourceBuffer) return;

    const removeEnd = Math.max(0, currentTime - 10);

    if (removeEnd > 0) {
      try {
        await this.#waitForBufferReady();

        // This sometimes happens when seeking, shouldn't be a big deal to return here?
        if (this.#sourceBuffer.updating) {
          return;
        }

        this.#sourceBuffer.remove(0, removeEnd);
      } catch (e) {
        console.error("Error pruning buffer:", e);
      }
    }
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
      this.#loadPlaylistSong(this.#playlistIndex + 1);
      playlistEntry = this.#playlist[this.#playlistIndex];
    }

    const buffer = this.#getBufferedSeconds();
    if (buffer < 10) {
      this.#sourceBuffer.timestampOffset = playlistEntry.timestampOffset;

      const segment = playlistEntry.segments[playlistEntry.segmentIndex];

      this.#sourceBuffer.appendBuffer(segment.data);
      this.#playlist[this.#playlistIndex].segments[
        playlistEntry.segmentIndex
      ].isInBuffer = true;

      this.#playlist[this.#playlistIndex].segmentIndex++;

      if (buffer + segment.duration < 10) {
        await this.#waitForBufferReady();
        this.#loadNext();
      }
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

  async #loadPlaylistSong(index: number, startTime?: number) {
    if (index >= this.#playlist.length) {
      console.log(
        "Tried to fetch playlist song at index",
        index,
        "but it's outside playlist range, aborting",
      );
      return;
    }

    if (this.#playlist[index].isDataLoading) {
      console.log(
        "Tried to load song at index",
        index,
        "but it's already loading, aborting",
      );
      return;
    }

    if (this.#playlist[index].isDataLoaded) {
      console.log(
        "Tried to load song at index",
        index,
        "but it's already loading, aborting",
      );
      return;
    }

    if (index < 0 || index >= this.#playlist.length) {
      return;
    }

    // Don't fetch too many tracks
    if (Math.abs(index - this.#playlistIndex) >= 2) {
      return;
    }

    this.#playlist[index].isDataLoading = true;

    const controller = new AbortController();
    const signal = controller.signal;

    console.log(`Loading song ${index}: ${this.#playlist[index].song.title}`);
    const resp = await fetch(
      `http://localhost:3003/v1/tracks/${this.#playlist[index].song.id}/stream${startTime !== undefined ? `?ss=${startTime}` : ""}`,
      { signal },
    );

    this.#playlist[index].abortController = controller;

    const reader = resp.body!.getReader();

    const mp4boxfile = mp4box.createFile();

    // Suppress dfLa errors (they're not important and just hog the console)
    const e = console.error;
    console.error = (...args) => {
      if (
        args.length === 3 &&
        args[1] === "[BoxParser]" &&
        args[2].includes?.("dfLa")
      ) {
        return;
      }

      e(...args);
    };

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
          isInBuffer: false,
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
          console.log(this.#playlist[index]);
          this.#playlist[index].abortController = null;
          this.#playlist[index].isDataLoaded = true;
          this.#playlist[index].isDataLoading = false;

          const pe = this.#playlist[index];
          const songDuration = pe.segments[pe.segments.length - 1].end;

          this.#playlist[index].accurateDuration = songDuration;

          if (index + 1 < this.#playlist.length) {
            this.#playlist[index + 1].timestampOffset =
              pe.timestampOffset + songDuration;
          }

          mp4boxfile.flush();

          this.#loadNext();
          this.#loadPlaylistSong(index + 1);

          break;
        }

        // We stopped the loading somewhere else
        if (!this.#playlist[index].isDataLoading) {
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
