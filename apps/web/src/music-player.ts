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
};

export class MusicPlayer {
  #mediaSource!: MediaSource;
  #sourceBuffer!: SourceBuffer;
  #audio: HTMLAudioElement;
  playlist: PlaylistSong[];
  #lastNotifiedTrackIndex: number | null = null;
  #bufferSizeBehind = 10;
  #bufferSizeForward = 10;
  #lastPlayingSongIndex: number | null = null;
  #bufferOperationsQueue: Promise<void> = Promise.resolve();
  #trackJumpsQueue: Promise<void> = Promise.resolve();
  #isBufferOperationsLocked = false;

  constructor() {
    this.playlist = [];
    this.#audio = new Audio();

    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("root")!.appendChild(this.#audio);

      this.#initMediaSource();
    });
  }

  #enqueueTrackJump<T>(operation: () => Promise<T>): Promise<T> {
    const promise = this.#trackJumpsQueue.then(operation);

    this.#trackJumpsQueue = promise.then(
      () => { },
      () => { },
    );

    return promise;
  }

  #enqueueBufferOperation<T>(operation: () => Promise<T>): Promise<T> {
    const promise = this.#bufferOperationsQueue.then(operation);

    this.#bufferOperationsQueue = promise.then(
      () => { },
      () => { },
    );

    return promise;
  }

  #getCurrentlyPlayingSongIndex(includePausedAndStopped = false) {
    const currentTime = this.#audio.currentTime;
    for (let i = 0; i < this.playlist.length; i++) {
      const pe = this.playlist[i];

      if (pe.timestampOffset === null) {
        continue;
      }

      const trackStart = pe.timestampOffset + pe.seekOffset;
      const trackEnd =
        // Substract 0.5 from the end because it's not fully accurate anyways.
        // This prevents some jump seeks from showing the incorrect track at the start of the track
        trackStart + (pe.accurateDuration || pe.song.duration - 0.5);

      if (currentTime >= trackStart && currentTime < trackEnd) {
        this.#lastPlayingSongIndex = i;
        return i;
      }
    }

    if (includePausedAndStopped) {
      return this.#lastPlayingSongIndex;
    } else {
      return null;
    }
  }

  async #initMediaSource() {
    this.#mediaSource = new MediaSource();

    this.#audio.src = URL.createObjectURL(this.#mediaSource);
    this.#audio.volume = 0.2;
    this.#audio.autoplay = true;

    this.#mediaSource.addEventListener("sourceopen", () => {
      const mime = "audio/mp4;codecs=flac";
      this.#sourceBuffer = this.#mediaSource.addSourceBuffer(mime);
      this.#sourceBuffer.mode = "segments";
      this.#sourceBuffer.timestampOffset = 0;
    });

    this.#audio.addEventListener("timeupdate", async () => {
      const track = this.#getCurrentlyPlayingSongIndex();
      if (track !== null) {
        this.#handleTrackChange(track);
      }

      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          currentTime: this.#audio.currentTime,
          buffer: this.#getBufferedRange(),
        },
      });

      if (!this.#isBufferOperationsLocked) {
        this.#maybePruneBuffer();
        this.#maybeLoadNextSegment();
      }
    });

    this.#audio.addEventListener("progress", () => {
      usePlayerState.setState({
        playInfo: {
          ...usePlayerState.getState().playInfo!,
          buffer: this.#getBufferedRange(),
        },
      });
    });

    this.#audio.addEventListener("volumechange", () => {
      const state = usePlayerState.getState().playInfo;

      if (state) {
        usePlayerState.setState({
          playInfo: {
            ...state,
            volume: this.#audio.volume,
          },
        });
      }
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

  toggleMute() {
    this.#audio.muted = !this.#audio.muted;

    const state = usePlayerState.getState().playInfo;

    if (state) {
      usePlayerState.setState({
        playInfo: {
          ...state,
          isMuted: this.#audio.muted,
        },
      });
    }
  }

  setVolume(volume: number) {
    this.#audio.volume = volume;

    const state = usePlayerState.getState().playInfo;

    if (state) {
      usePlayerState.setState({
        playInfo: {
          ...state,
          volume,
        },
      });
    }
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
        this.playlist[i].isDataLoaded = false;
        this.playlist[i].isDataLoading = false;
        this.playlist[i].accurateDuration = null;
      }
    }

    this.#lastNotifiedTrackIndex = index;

    this.#maybeLoadPlaylistSong(index + 1);
    this.#notifyTrackChange(index);
  }

  #notifyTrackChange(index: number) {
    const existingPlayInfo = usePlayerState.getState().playInfo;

    usePlayerState.setState({
      playInfo: existingPlayInfo
        ? {
          ...existingPlayInfo,
          volume: this.#audio.volume,
          isMuted: this.#audio.muted,
          timestampOffset: this.playlist[index].timestampOffset,
          seekOffset: this.playlist[index].seekOffset,
          song: this.playlist[index].song,
          playlistIndex: index,
          currentTime: this.#audio.currentTime,
        }
        : // TODO: some of these defaults are probably incorrect
        {
          currentTime: this.#audio.currentTime,
          volume: this.#audio.volume,
          isMuted: this.#audio.muted,
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

    this.#lastPlayingSongIndex = index;
    this.playlist = songs.map((s) => ({
      song: s,
      segments: [],
      timestampOffset: null,
      seekOffset: 0,
      accurateDuration: null,
      isDataLoaded: false,
      isDataLoading: false,
      abortController: null,
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

    this.#maybeLoadPlaylistSong(index, {
      segmentLoadedCb: (index) => {
        if (index === 0) {
          this.#maybeLoadNextSegment();
        }
      },
    });
  }

  async #lockAutomaticBufferOperations() {
    this.#isBufferOperationsLocked = true;
  }

  async #unlockAutomaticBufferOperations() {
    this.#isBufferOperationsLocked = false;
  }

  async #clearBufferOperationsQueues() {
    await this.#bufferOperationsQueue.catch(() => { });
    this.#bufferOperationsQueue = Promise.resolve();
    await this.#waitForBufferReady();
    console.log("Cleared buffer operations");
  }

  togglePlayPause() {
    if (this.#audio.paused) {
      this.#audio.play();
    } else {
      this.#audio.pause();
    }
  }

  async #jumpTrack(direction: number) {
    console.log("\n\n\n\n\n\n\nJUMP TRACK");
    const currentIndex = this.#getCurrentlyPlayingSongIndex(true);

    if (currentIndex === null) {
      return;
    }

    const targetIndex = currentIndex + direction;

    if (targetIndex < 0 || targetIndex >= this.playlist.length) {
      return;
    }

    const pe = this.playlist[targetIndex];
    const segmentIndex =
      pe.seekOffset > 0 || pe.segments.length === 0 ? null : 0;

    if (segmentIndex === null) {
      // Segment not found
      console.log("Segment not found in buffer or memory, need to fetch.");
      console.log("Jumping to track index", targetIndex);

      pe.abortController?.abort();
      this.#lockAutomaticBufferOperations();
      await this.#clearBufferOperationsQueues();

      this.playlist[targetIndex].segments = [];
      this.playlist[targetIndex].isDataLoading = false;
      this.playlist[targetIndex].isDataLoaded = false;
      this.playlist[targetIndex].seekOffset = 0;

      await this.#clearSourceBuffer();

      this.#unlockAutomaticBufferOperations();
      this.#maybeLoadPlaylistSong(targetIndex, {
        segmentLoadedCb: (index) => {
          if (index === 0) {
            this.#maybeLoadNextSegment({
              playlistIndex: targetIndex,
              segmentIndex: 0,
            });
          }
        },
      });

      const listener = () => {
        if (this.playlist[targetIndex].segments[0]?.isInBuffer) {
          console.log(
            "jumping to",
            this.playlist[targetIndex].timestampOffset || 0,
          );
          this.#sourceBuffer.removeEventListener("updateend", listener);
          this.#audio.currentTime =
            this.playlist[targetIndex].timestampOffset || 0;
          this.#audio.play();
        }
      };

      this.#sourceBuffer.addEventListener("updateend", listener);
      return;
    }

    const segment = this.playlist[targetIndex].segments[segmentIndex];

    const offset = pe.timestampOffset || 0;

    if (segment.isInBuffer) {
      this.#audio.currentTime = offset;
      this.#audio.play();
      return;
    }

    console.log("Segment is not in buffer but we have the data");
    console.log("Loading segment", segmentIndex);

    // Segment not in buffer but we have the data
    await this.#maybeLoadNextSegment({
      playlistIndex: targetIndex,
      segmentIndex,
    });

    this.#audio.currentTime = offset;
    this.#audio.play();
  }

  async prevTrack() {
    return this.#enqueueTrackJump(async () => {
      await this.#jumpTrack(-1);
    });
  }

  async nextTrack() {
    return this.#enqueueTrackJump(async () => {
      await this.#jumpTrack(1);
    });
  }

  #findSegmentIndexInPlaylist(playlistIndex: number, position: number) {
    const index = this.playlist[playlistIndex].segments.findIndex(
      (seg) => position >= seg.start && position <= seg.end,
    );

    if (index === -1) {
      return null;
    }

    return index;
  }

  async seek(positionPerc: number) {
    console.log({ buffer: this.#getBufferedRanges() });

    const currentIndex = this.#getCurrentlyPlayingSongIndex(true);
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
    const targetSegmentIndex = this.#findSegmentIndexInPlaylist(
      currentIndex,
      offsetPosition,
    );

    console.log("\n\n\n\n\n\n\n\n\n\nSEEK");
    console.log({ position });
    console.log({ seekOffset: current.seekOffset });
    console.log({ offsetPosition });
    console.log({ targetSegmentIndex });
    console.log({ current });

    // Found segment
    if (
      targetSegmentIndex !== null &&
      current.segments[targetSegmentIndex].isInBuffer
    ) {
      const seekPos = position + (current.timestampOffset || 0);
      console.log("Segment is in buffer, seeking to", seekPos);
      this.#audio.currentTime = seekPos;
      return;
    }

    if (
      targetSegmentIndex !== null &&
      !current.segments[targetSegmentIndex].isInBuffer
    ) {
      console.warn("Segment is in memory, but not buffer, jumping there now!");

      if (this.playlist[currentIndex].timestampOffset === null) {
        console.error("Timestamp offset is null");
      }

      await this.#maybeLoadNextSegment({
        segmentIndex: targetSegmentIndex,
      });
      this.#audio.currentTime = position + (current.timestampOffset || 0);

      console.log("Got done seeking");

      return;
    }

    // Segment not found
    console.log("Segment not found in buffer or memory, need to fetch.");
    current.abortController?.abort();

    this.playlist[currentIndex].segments = [];
    this.playlist[currentIndex].isDataLoading = false;
    this.playlist[currentIndex].isDataLoaded = false;
    this.playlist[currentIndex].seekOffset = position;

    await this.#clearSourceBuffer();

    this.#maybeLoadPlaylistSong(currentIndex, {
      startTime: position,
    });

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

    for (let i = 0; i < this.playlist.length; i++) {
      for (let j = 0; j < this.playlist[i].segments.length; j++) {
        this.playlist[i].segments[j].isInBuffer = false;
      }
    }

    if (this.#sourceBuffer.buffered.length > 0) {
      console.warn("Buffer not empty after clear");
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
    return this.#enqueueBufferOperation(async () => {
      await this.#pruneBuffer();
    });
  }

  async #pruneBuffer() {
    const currentTime = this.#audio.currentTime;
    const currentIndex = this.#getCurrentlyPlayingSongIndex();

    if (!this.#sourceBuffer || currentIndex === null) {
      return;
    }

    let nrRemovedSegments = 0;
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

          this.#sourceBuffer.remove(
            offset + segment.start,
            offset + segment.end,
          );
          nrRemovedSegments++;

          await this.#waitForBufferReady();
          this.playlist[i].segments[j].isInBuffer = false;
        }
      }
    }

    if (nrRemovedSegments > 0) {
      console.log(
        "Removed",
        nrRemovedSegments,
        "segments, buffer:",
        this.#getBufferedRanges(),
      );
    }
  }

  async #maybeLoadNextSegment(options?: {
    playlistIndex?: number;
    segmentIndex?: number;
    force?: boolean;
  }) {
    const buffer = this.#getBufferedSeconds();
    if (
      !options?.force &&
      options?.segmentIndex === undefined &&
      buffer >= this.#bufferSizeForward
    ) {
      return;
    }

    return this.#enqueueBufferOperation(async () => {
      await this.#loadNextSegment(options);
    });
  }

  async #loadNextSegment(options?: {
    playlistIndex?: number;
    segmentIndex?: number;
  }) {
    let playlistIndex =
      options?.playlistIndex !== undefined
        ? options.playlistIndex
        : this.#getCurrentlyPlayingSongIndex(true);
    if (playlistIndex === null) {
      console.error("Couldn't find currently playing song");
      return;
    }

    if (playlistIndex < 0 || playlistIndex >= this.playlist.length) {
      console.error("Playlist index is out of bounds:", playlistIndex);
      return;
    }

    let pe = this.playlist[playlistIndex];

    const position = this.#audio.currentTime;

    // Adjust position for already seeked position if it exists,
    // because the segments always start at 0
    const offsetPosition = position - pe.seekOffset - (pe.timestampOffset || 0);
    let segmentIndex =
      options?.segmentIndex !== undefined
        ? options.segmentIndex
        : this.#findSegmentIndexInPlaylist(playlistIndex, offsetPosition);

    if (segmentIndex === null) {
      console.log("Couldn't find segment index, probably not loaded");

      if (pe.isDataLoaded) {
        console.error("But the data is already loaded");
      }
      return;
    }

    // Let's not append segments that are already in the buffer (might happen due to seeking)
    while (
      playlistIndex < this.playlist.length &&
      segmentIndex < pe.segments.length &&
      pe.segments[segmentIndex].isInBuffer
    ) {
      segmentIndex++;

      if (segmentIndex >= pe.segments.length && pe.isDataLoaded) {
        playlistIndex++;
        pe = this.playlist[playlistIndex];
        segmentIndex = 0;
      }
    }

    if (playlistIndex >= this.playlist.length) {
      console.info("Reached end of playlist, can't append more");
      return;
    }

    if (segmentIndex >= pe.segments.length) {
      if (!pe.isDataLoaded) {
      } else {
        console.error("Can't load another segment for unknown reason");
      }
      return;
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

    const segment = pe.segments[segmentIndex];

    console.log(
      "Appending segment",
      segmentIndex,
      "at playlist",
      playlistIndex,
      "buffer:",
      this.#getBufferedRanges(),
      "is updating:",
      this.#sourceBuffer.updating,
    );

    this.#sourceBuffer.appendBuffer(segment.data);
    this.playlist[playlistIndex].segments[segmentIndex].isInBuffer = true;

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

  async #maybeLoadPlaylistSong(
    index: number,
    options?: {
      startTime?: number;
      segmentLoadedCb?: (index: number) => void;
    },
  ) {
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
    const currentlyPlayingSongIndex = this.#getCurrentlyPlayingSongIndex();
    if (
      currentlyPlayingSongIndex !== null &&
      Math.abs(index - currentlyPlayingSongIndex) >= 2
    ) {
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
      `http://localhost:3003/v1/tracks/${this.playlist[index].song.id}/stream${options?.startTime !== undefined ? `?ss=${options?.startTime}` : ""}`,
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

    let nrLoadedSegments = 0;

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

        options?.segmentLoadedCb?.(nrLoadedSegments++);
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

          // Update offsets for future tracks
          for (let i = index + 1; i < this.playlist.length; i++) {
            const peLast = this.playlist[i - 1];
            if (
              peLast.timestampOffset === null ||
              peLast.accurateDuration === null
            ) {
              break;
            }

            this.playlist[i].timestampOffset =
              peLast.timestampOffset +
              peLast.seekOffset +
              peLast.accurateDuration;
          }

          this.#maybeLoadPlaylistSong(index + 1);

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
