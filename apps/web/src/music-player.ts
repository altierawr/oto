import { usePlayerState } from "./store";
import type { Song } from "./types";
import * as mp4box from "mp4box";

type PlaylistSong = {
  song: Song;
  segments: {
    data: Uint8Array<ArrayBuffer>;
    start: number;
    end: number;
    duration: number;
    isInBuffer: boolean;
  }[];
  accurateDuration: number | null;
  timestampOffset: number | null;
  timestampOffsetType?: "seek" | "sequence";
  isDataLoading: boolean;
  isDataLoaded: boolean;
  abortController: AbortController | null;
  segmentIndex: number;
};

export class MusicPlayer {
  #mediaSource!: MediaSource;
  #sourceBuffer!: SourceBuffer;
  #audio: HTMLAudioElement;
  playlist: PlaylistSong[];
  #playlistIndex: number = 0;
  #lastNotifiedTrackIndex: number | null = null;
  #bufferSizeBehind = 10;
  #bufferSizeForward = 10;

  constructor() {
    this.playlist = [];
    this.#audio = new Audio();

    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("root")!.appendChild(this.#audio);

      this.#initMediaSource();
    });
  }

  #getCurrentlyPlayingSongIndex() {
    const currentTime = this.#audio.currentTime;
    for (let i = 0; i < this.playlist.length; i++) {
      const pe = this.playlist[i];

      const trackStart = pe.timestampOffset;

      if (trackStart === null) {
        continue;
      }

      const trackEnd = trackStart + (pe.accurateDuration || pe.song.duration);

      if (currentTime >= trackStart && currentTime < trackEnd) {
        return i;
      }
    }

    return null;
  }

  async #initMediaSource() {
    this.#mediaSource = new MediaSource();

    this.#audio.src = URL.createObjectURL(this.#mediaSource);
    this.#audio.volume = 0.05;
    this.#audio.autoplay = true;

    this.#mediaSource.addEventListener("sourceopen", () => {
      const mime = "audio/mp4;codecs=flac";
      this.#sourceBuffer = this.#mediaSource.addSourceBuffer(mime);
      this.#sourceBuffer.mode = "segments";
      this.#sourceBuffer.timestampOffset = 0;
    });

    this.#audio.addEventListener("timeupdate", () => {
      const track = this.#getCurrentlyPlayingSongIndex();
      if (track) {
        this.#notifyTrackChange(track);
      }

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

  #notifyTrackChange(index: number) {
    if (index === this.#lastNotifiedTrackIndex) {
      return;
    }

    this.#lastNotifiedTrackIndex = index;

    const existingPlayInfo = usePlayerState.getState().playInfo;

    usePlayerState.setState({
      playInfo: existingPlayInfo
        ? {
          ...existingPlayInfo,
          timestampOffset: this.playlist[index].timestampOffset,
          song: this.playlist[index].song,
          playlistIndex: index,
          currentTime: this.#audio.currentTime,
        }
        : // TODO: some of these defaults are probably incorrect
        {
          currentTime: this.#audio.currentTime,
          timestampOffset: 0,
          isBuffering: true,
          isPaused: false,
          song: this.playlist[index].song,
          buffer: this.#getBufferedRange(),
          playlist: this.playlist.map((pe) => pe.song),
          playlistIndex: index,
        },
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

  async #reset() {
    for (const song of this.playlist) {
      song.abortController?.abort();
    }

    this.#lastNotifiedTrackIndex = null;
  }

  async playSongs(songs: Song[], index: number) {
    console.log("Requested playback of", songs.length, "songs");
    this.#reset();

    this.#playlistIndex = index;
    this.playlist = songs.map((s) => ({
      song: s,
      segments: [],
      timestampOffset: null,
      accurateDuration: null,
      isDataLoaded: false,
      isDataLoading: false,
      abortController: null,
      segmentIndex: 0,
    }));

    this.#notifyTrackChange(index);

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
    const currentIndex = this.#getCurrentlyPlayingSongIndex();
    if (currentIndex === null) {
      console.error("Couldn't find currently playing song");
      return;
    }

    const current = this.playlist[currentIndex];

    const position = parseFloat(
      (current.song.duration * positionPerc).toFixed(1),
    );

    const offset =
      current.timestampOffsetType === "seek" ? current.timestampOffset || 0 : 0;

    const offsetPosition = position - offset;

    console.log("Timestamp offset is", current.timestampOffset);
    console.log("Using an actual offset of", offset);

    console.log(current.segments);

    const targetSegmentIndex = current.segments.findIndex(
      (seg) => offsetPosition >= seg.start && offsetPosition <= seg.end,
    );

    // Found segment
    if (
      targetSegmentIndex !== -1 &&
      current.segments[targetSegmentIndex].isInBuffer
    ) {
      const seekPosition =
        position +
        (current.timestampOffsetType === "seek"
          ? 0
          : current.timestampOffset || 0);
      console.log("Segment is in buffer, seeking to", seekPosition);
      this.#audio.currentTime = seekPosition;
      return;
    }

    if (
      targetSegmentIndex !== -1 &&
      !current.segments[targetSegmentIndex].isInBuffer
    ) {
      console.warn("SEGMENT IS IN MEMORY BUT NOT IN BUFFER, IMPLEMENT THIS");
    }

    // Segment not found
    console.log("SEEKING TO UNKNOWN TERRITORY (danger)");
    current.abortController?.abort();

    this.playlist[this.#playlistIndex].segments = [];
    this.playlist[this.#playlistIndex].segmentIndex = 0;
    this.playlist[this.#playlistIndex].isDataLoading = false;
    this.playlist[this.#playlistIndex].isDataLoaded = false;
    this.playlist[this.#playlistIndex].timestampOffset = position;
    this.playlist[this.#playlistIndex].timestampOffsetType = "seek";

    await this.#clearSourceBuffer();

    this.#loadPlaylistSong(this.#playlistIndex, position);

    this.#sourceBuffer.addEventListener(
      "updateend",
      () => {
        this.#audio.currentTime = position;
      },
      { once: true },
    );
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

    for (let i = 0; i < this.playlist.length; i++) {
      const pe = this.playlist[i];
      const offset = pe.timestampOffset || 0;

      const time = currentTime - offset;
      if (time < 0) {
        return;
      }

      for (let j = 0; j < pe.segments.length; j++) {
        const segment = pe.segments[j];
        if (
          time >= segment.start - this.#bufferSizeBehind &&
          time <= segment.end + this.#bufferSizeForward
        ) {
          continue;
        }

        if (segment.isInBuffer) {
          await this.#waitForBufferReady();
          if (this.#sourceBuffer.updating) {
            continue;
          }

          this.#sourceBuffer.remove(
            offset + segment.start,
            offset + segment.end,
          );
          await this.#waitForBufferReady();
          this.playlist[i].segments[j].isInBuffer = false;
          console.log(
            "Removed segment",
            j,
            "from playlist index",
            i,
            "from the buffer",
          );
        }
      }
    }

    const removeEnd = Math.max(0, currentTime - this.#bufferSizeBehind);

    if (removeEnd > 0) {
      try {
        await this.#waitForBufferReady();

        // This sometimes happens when seeking, shouldn't be a big deal to return here?
        if (this.#sourceBuffer.updating) {
          return;
        }

        this.#sourceBuffer.remove(0, removeEnd);

        await this.#waitForBufferReady();
      } catch (e) {
        console.error("Error pruning buffer:", e);
      }
    }
  }

  async #loadNext() {
    if (this.#sourceBuffer.updating) {
      return;
    }

    let pe = this.playlist[this.#playlistIndex];
    if (pe.segments.length <= pe.segmentIndex && !pe.isDataLoaded) {
      return;
    }

    // Switch over to the next track if we're done loading the current one
    if (
      pe.isDataLoaded &&
      pe.segments.length === pe.segmentIndex &&
      this.playlist.length - 1 > this.#playlistIndex
    ) {
      console.log("Switching to next track");
      this.#playlistIndex++;
      this.#loadPlaylistSong(this.#playlistIndex + 1);
      pe = this.playlist[this.#playlistIndex];
    }

    const buffer = this.#getBufferedSeconds();
    if (buffer < this.#bufferSizeForward) {
      if (pe.timestampOffset === null) {
        console.error(
          "Tried to append buffer but timestamp offset is null for playlist entry",
          pe,
        );
        return;
      }
      this.#sourceBuffer.timestampOffset = pe.timestampOffset;

      const segment = pe.segments[pe.segmentIndex];

      this.#sourceBuffer.appendBuffer(segment.data);
      this.playlist[this.#playlistIndex].segments[pe.segmentIndex].isInBuffer =
        true;

      this.playlist[this.#playlistIndex].segmentIndex++;

      if (buffer + segment.duration < this.#bufferSizeForward) {
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
    if (index >= this.playlist.length) {
      console.log(
        "Tried to fetch playlist song at index",
        index,
        "but it's outside playlist range, aborting",
      );
      return;
    }

    if (this.playlist[index].isDataLoading) {
      console.log(
        "Tried to load song at index",
        index,
        "but it's already loading, aborting",
      );
      return;
    }

    if (this.playlist[index].isDataLoaded) {
      console.log(
        "Tried to load song at index",
        index,
        "but it's already loading, aborting",
      );
      return;
    }

    if (index < 0 || index >= this.playlist.length) {
      return;
    }

    // Don't fetch too many tracks
    if (Math.abs(index - this.#playlistIndex) >= 2) {
      return;
    }

    this.playlist[index].isDataLoading = true;

    if (this.playlist[index].timestampOffset === null) {
      this.playlist[index].timestampOffset = 0;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    console.log(`Loading song ${index}: ${this.playlist[index].song.title}`);
    const resp = await fetch(
      `http://localhost:3003/v1/tracks/${this.playlist[index].song.id}/stream${startTime !== undefined ? `?ss=${startTime}` : ""}`,
      { signal },
    );

    this.playlist[index].abortController = controller;

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

        this.playlist[index].segments.push({
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
            this.playlist[index].song.title,
          );
          console.log(this.playlist[index]);

          mp4boxfile.flush();

          this.playlist[index].abortController = null;
          this.playlist[index].isDataLoaded = true;
          this.playlist[index].isDataLoading = false;

          const pe = this.playlist[index];
          const songDuration = pe.segments[pe.segments.length - 1].end;

          this.playlist[index].accurateDuration = songDuration;

          if (index + 1 < this.playlist.length && pe.timestampOffset !== null) {
            this.playlist[index + 1].timestampOffset =
              pe.timestampOffset + songDuration;
            this.playlist[index + 1].timestampOffsetType = "sequence";
          }

          this.#loadNext();
          this.#loadPlaylistSong(index + 1);

          break;
        }

        // We stopped the loading somewhere else
        if (!this.playlist[index].isDataLoading) {
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
