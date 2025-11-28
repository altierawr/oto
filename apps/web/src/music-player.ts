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
  seekOffset: number;
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
  #bufferIndex: number = 0;
  #lastNotifiedTrackIndex: number | null = null;
  #bufferSizeBehind = 10;
  #bufferSizeForward = 10;
  #isBufferBeingAppended = false;
  #isBufferBeingPruned = false;

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

      if (pe.timestampOffset === null) {
        continue;
      }

      const trackStart = pe.timestampOffset + pe.seekOffset;
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

    this.#audio.addEventListener("timeupdate", async () => {
      const track = this.#getCurrentlyPlayingSongIndex();
      if (track) {
        this.#handleTrackChange(track);
      }

      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          currentTime: this.#audio.currentTime,
          buffer: this.#getBufferedRange(),
        },
      });

      await this.#maybePruneBuffer();
      await this.#maybeLoadNextSegment();
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

  #handleTrackChange(index: number) {
    if (index === this.#lastNotifiedTrackIndex) {
      return;
    }

    // Free memory of playlist items more than 1 track away
    for (let i = 0; i < this.playlist.length; i++) {
      if (Math.abs(i - index) > 1) {
        this.playlist[i].abortController?.abort();
        this.playlist[i].segments = [];
        this.playlist[i].segmentIndex = 0;
        this.playlist[i].isDataLoaded = false;
        this.playlist[i].isDataLoading = false;
        this.playlist[i].accurateDuration = null;
      }
    }

    this.#lastNotifiedTrackIndex = index;

    this.#notifyTrackChange(index);
  }

  #notifyTrackChange(index: number) {
    const existingPlayInfo = usePlayerState.getState().playInfo;

    usePlayerState.setState({
      playInfo: existingPlayInfo
        ? {
          ...existingPlayInfo,
          timestampOffset: this.playlist[index].timestampOffset,
          seekOffset: this.playlist[index].seekOffset,
          song: this.playlist[index].song,
          playlistIndex: index,
          currentTime: this.#audio.currentTime,
        }
        : // TODO: some of these defaults are probably incorrect
        {
          currentTime: this.#audio.currentTime,
          timestampOffset: 0,
          seekOffset: 0,
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
    const ranges = this.#getBufferedRanges();

    if (ranges.length === 0) {
      return null;
    }

    return {
      from: ranges[0].start,
      to: ranges[ranges.length - 1].end,
    };
  }

  #getBufferedRanges() {
    const buffered = this.#audio.buffered;

    const ranges = [];
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: buffered.start(i),
        end: buffered.end(i),
      });
    }

    return ranges;
  }

  async #reset() {
    for (const song of this.playlist) {
      song.abortController?.abort();
    }

    this.#lastNotifiedTrackIndex = null;
  }

  async playSongs(songs: Song[], index: number) {
    this.#reset();

    this.#bufferIndex = index;
    this.playlist = songs.map((s) => ({
      song: s,
      segments: [],
      timestampOffset: null,
      seekOffset: 0,
      accurateDuration: null,
      isDataLoaded: false,
      isDataLoading: false,
      abortController: null,
      segmentIndex: 0,
    }));

    this.#handleTrackChange(index);

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

    // Adjust position for already seeked position if it exists,
    // because the segments always start at 0
    const offsetPosition = position - current.seekOffset;
    const targetSegmentIndex = current.segments.findIndex(
      (seg) => offsetPosition >= seg.start && offsetPosition <= seg.end,
    );

    console.log("\n\n\n\n\n\n\n\n\n\nSEEK");
    console.log({ position });
    console.log({ seekOffset: current.seekOffset });
    console.log({ offsetPosition });
    console.log({ targetSegmentIndex });
    console.log({ current });

    // Found segment
    if (
      targetSegmentIndex !== -1 &&
      current.segments[targetSegmentIndex].isInBuffer
    ) {
      const seekPos = position + (current.timestampOffset || 0);
      console.log("Segment is in buffer, seeking to", seekPos);
      this.#audio.currentTime = seekPos;
      return;
    }

    if (
      false &&
      targetSegmentIndex !== -1 &&
      !current.segments[targetSegmentIndex].isInBuffer
    ) {
      console.warn("Segment is in memory, but not buffer, jumping there now!");
      while (this.#sourceBuffer.updating) {
        await this.#waitForBufferReady();
      }

      if (this.playlist[currentIndex].timestampOffset === null) {
        console.error("Timestamp offset is null");
      }

      this.playlist[currentIndex].segmentIndex = targetSegmentIndex;

      if (this.#bufferIndex !== currentIndex) {
        this.playlist[this.#bufferIndex].segmentIndex = 0;
        this.#bufferIndex = currentIndex;
      }

      await this.#maybeLoadNextSegment(true);
      while (this.#sourceBuffer.updating) {
        await this.#waitForBufferReady();
      }

      this.#audio.currentTime = position + (current.timestampOffset || 0);
      console.log("Got done seeking");

      return;
    }

    // Segment not found
    console.log("Segment not found in buffer or memory, need to fetch.");
    current.abortController?.abort();

    this.playlist[currentIndex].segments = [];
    this.playlist[currentIndex].segmentIndex = 0;
    this.playlist[currentIndex].isDataLoading = false;
    this.playlist[currentIndex].isDataLoaded = false;
    this.playlist[currentIndex].seekOffset = position;

    await this.#clearSourceBuffer();

    // We might've started loading the next track already
    if (this.#bufferIndex !== currentIndex) {
      this.playlist[this.#bufferIndex].segmentIndex = 0;
      this.#bufferIndex = currentIndex;
    }

    this.#loadPlaylistSong(currentIndex, position);

    this.#sourceBuffer.addEventListener(
      "updateend",
      () => {
        console.log("jumping to", position + (current.timestampOffset || 0));
        this.#audio.currentTime = position + (current.timestampOffset || 0);
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
        async () => {
          if (this.#sourceBuffer.updating) {
            await this.#waitForBufferReady();
            resolve();
          } else {
            resolve();
          }
        },
        { once: true },
      );
    });
  }

  async #maybePruneBuffer() {
    if (!this.#isBufferBeingPruned && !this.#isBufferBeingAppended) {
      this.#isBufferBeingPruned = true;

      try {
        await this.#pruneBuffer();
      } finally {
        this.#isBufferBeingPruned = false;
      }
    }
  }

  async #pruneBuffer() {
    const currentTime = this.#audio.currentTime;
    const currentIndex = this.#getCurrentlyPlayingSongIndex();

    if (!this.#sourceBuffer || currentIndex === null) {
      return;
    }

    for (let i = currentIndex - 1; i <= currentIndex + 1; i++) {
      if (i < 0 || i >= this.playlist.length) {
        continue;
      }

      const pe = this.playlist[i];
      const offset = pe.seekOffset + (pe.timestampOffset || 0);

      const time = currentTime - offset;

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
        }
      }
    }
  }

  async #maybeLoadNextSegment(force: boolean = false) {
    const buffer = this.#getBufferedSeconds();
    if (!force && buffer >= this.#bufferSizeForward) {
      return;
    }

    let pe = this.playlist[this.#bufferIndex];

    // We've already loaded all data we currently have but there is still more data to be loaded
    if (pe.segmentIndex >= pe.segments.length && !pe.isDataLoaded) {
      return;
    }

    if (!this.#isBufferBeingAppended && !this.#isBufferBeingPruned) {
      this.#isBufferBeingAppended = true;
      try {
        await this.#loadNextSegment();
      } finally {
        this.#isBufferBeingAppended = false;
      }
    }
  }

  async #loadNextSegment() {
    let pe = this.playlist[this.#bufferIndex];

    // Let's not append segments that are already in the buffer (might happen due to seeking)
    while (
      pe.segmentIndex < pe.segments.length &&
      pe.segments[pe.segmentIndex].isInBuffer
    ) {
      this.playlist[this.#bufferIndex].segmentIndex++;
      pe = this.playlist[this.#bufferIndex];
    }

    // Switch over to the next track if we're done loading the current one
    if (
      pe.isDataLoaded &&
      pe.segments.length === pe.segmentIndex &&
      this.playlist.length - 1 > this.#bufferIndex
    ) {
      console.log("Switching to next track");
      this.#bufferIndex++;
      this.#loadPlaylistSong(this.#bufferIndex + 1);
      pe = this.playlist[this.#bufferIndex];
    }

    if (pe.timestampOffset === null) {
      console.error(
        "Tried to append buffer but timestamp offset is null for playlist entry",
        pe,
      );
      return;
    }

    await this.#waitForBufferReady();

    // Segments for each track start at 0 so adjust the timestamp offset to the start of the current track
    this.#sourceBuffer.timestampOffset = pe.timestampOffset + pe.seekOffset;

    const segment = pe.segments[pe.segmentIndex];
    console.log("Is updating?", this.#sourceBuffer.updating);
    this.#sourceBuffer.appendBuffer(segment.data);
    this.playlist[this.#bufferIndex].segments[pe.segmentIndex].isInBuffer =
      true;

    this.playlist[this.#bufferIndex].segmentIndex++;

    await this.#waitForBufferReady();
  }

  #getBufferedSeconds() {
    const currentTime = this.#audio.currentTime;
    const buffered = this.#audio.buffered;

    for (let i = 0; i < buffered.length; i++) {
      const start = buffered.start(i);
      const end = buffered.end(i);

      if (currentTime >= start && currentTime < end) {
        return end - currentTime;
      }

      if (currentTime >= end) {
        return 0;
      }
    }

    return 0;
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
    if (Math.abs(index - this.#bufferIndex) >= 2) {
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

        this.#maybeLoadNextSegment();

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
              pe.timestampOffset + pe.seekOffset + songDuration;
          }

          this.#loadPlaylistSong(index + 1);
          this.#maybeLoadNextSegment();

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
