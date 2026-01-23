import { usePlayerState, type TPlayerState } from "./store";
import * as mp4box from "mp4box";

import type { Song, StreamResponse, SeekResponse } from "./types";
import { shuffleArray } from "./utils/utils";

type PlaylistSong = {
  id: string;
  song: Song;
  initSegment?: Uint8Array<ArrayBuffer>;
  segments: (
    | {
        data: Uint8Array<ArrayBuffer>;
        start: number;
        end: number;
        duration: number;
        bufferInfo?: {
          start: number;
          end: number;
          duration: number;
        };
      }
    | undefined
  )[];
  lastSegmentIndex: number | null;
  streamId: string | null;
  accurateDuration: number | null;
  timestampOffset: number | null;
  seekOffset: number;
};

const initialVolume = 0.2;

export class MusicPlayer {
  #mediaSource!: MediaSource;
  #sourceBuffer!: SourceBuffer;
  #audio: HTMLAudioElement;
  playlist: PlaylistSong[];
  #lastNotifiedTrackIndex: number | null = null;
  #fetchSizeForward = 120; // about 2 minutes
  #bufferSizeBehind = 10;
  #bufferSizeForward = 10;
  #lastPlayingSongIndex: number | null = null;
  #bufferOperationsQueue: Promise<void> = Promise.resolve();
  #trackJumpsQueue: Promise<void> = Promise.resolve();
  #segmentFetchQueue: Promise<void> = Promise.resolve();
  #isBufferOperationsLocked = false;
  #isFetchOperationsLocked = false;
  #isResetting = false;
  #volume = initialVolume;
  #isShuffleEnabled = false;
  #isRepeatEnabled = false;
  #isSeeking = false;
  #trackEndCommitBoundary = 0.7;
  originalPlaylist: PlaylistSong[] | null = null;

  static getInitialPlayerState(): TPlayerState["playerState"] {
    return {
      volume: initialVolume,
      isMuted: false,
      isPaused: false,
      isBuffering: false,
      seekOffset: 0,
      playlist: [],
      isShuffleEnabled: false,
      isRepeatEnabled: false,
      playlistIndex: null,
      timestampOffset: null,
      currentTime: null,
      buffer: null,
    };
  }

  constructor() {
    this.playlist = [];
    this.#audio = new Audio();

    document.addEventListener("DOMContentLoaded", () => {
      document.getElementById("root")!.appendChild(this.#audio);

      this.#initMediaSource();
    });

    document.addEventListener("keydown", (e) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        this.togglePlayPause();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        this.seekForward();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        this.seekBackward();
      }
    });
  }

  #enqueueTrackJump<T>(operation: () => Promise<T>): Promise<T> {
    const promise = this.#trackJumpsQueue.then(operation);

    this.#trackJumpsQueue = promise.then(
      () => {},
      () => {},
    );

    return promise;
  }

  #enqueueBufferOperation<T>(operation: () => Promise<T>): Promise<T> {
    const promise = this.#bufferOperationsQueue.then(operation);

    this.#bufferOperationsQueue = promise.then(
      () => {},
      () => {},
    );

    return promise;
  }

  #enqueueSegmentFetch<T>(operation: () => Promise<T>): Promise<T> {
    const promise = this.#segmentFetchQueue.then(operation);

    this.#segmentFetchQueue = promise.then(
      () => {},
      () => {},
    );

    return promise;
  }

  #getCurrentlyPlayingSongIndex(includePausedAndStopped = false) {
    const currentTime = this.#audio.currentTime;
    for (let i = 0; i < this.playlist.length; i++) {
      const pe = this.playlist[i];

      if (
        pe.timestampOffset === null ||
        (pe.seekOffset > 0 && !pe.accurateDuration)
      ) {
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
    this.setVolume(this.#volume);
    this.#audio.autoplay = true;

    this.#mediaSource.addEventListener("sourceopen", () => {
      const mime = "audio/mp4;codecs=flac";
      this.#sourceBuffer = this.#mediaSource.addSourceBuffer(mime);
      this.#sourceBuffer.mode = "segments";
      this.#sourceBuffer.timestampOffset = 0;
    });

    this.#audio.addEventListener("timeupdate", async () => {
      if (
        this.#isResetting ||
        (this.#isBufferOperationsLocked && this.#isFetchOperationsLocked)
      ) {
        return;
      }

      const track = this.#getCurrentlyPlayingSongIndex();
      if (track !== null) {
        this.#handleTrackChange(track);
      }

      this.#updatePlayerState({
        currentTime: this.#audio.currentTime,
        buffer: this.#getBufferedRange(),
      });

      if (!this.#isBufferOperationsLocked) {
        this.#maybeLoadNextSegment();
        this.#maybePruneBuffer();
      }

      if (!this.#isFetchOperationsLocked) {
        this.#maybeFetchNextSegment();
      }

      const currentIndex = this.#getCurrentlyPlayingSongIndex(true);

      if (currentIndex !== null && currentIndex === this.playlist.length - 1) {
        const pe = this.playlist[currentIndex];

        if (pe.timestampOffset === null || pe.lastSegmentIndex === null) {
          return;
        }

        const segment = pe.segments[pe.lastSegmentIndex];

        if (
          !segment?.bufferInfo ||
          this.#audio.currentTime !== segment.bufferInfo.end
        ) {
          return;
        }

        // All checks passed, we should be at the end of the last song,
        // let's pause and jump to the start of the last track
        this.#audio.pause();
        this.#audio.currentTime = pe.timestampOffset;

        this.#updatePlayerState({
          isPaused: true,
          currentTime: pe.timestampOffset,
        });
      }
    });

    this.#audio.addEventListener("progress", () => {
      this.#updatePlayerState({
        buffer: this.#getBufferedRange(),
      });
    });

    this.#audio.addEventListener("waiting", () => {
      this.#updatePlayerState({
        isBuffering: true,
      });
    });

    this.#audio.addEventListener("canplay", () => {
      this.#updatePlayerState({
        isBuffering: false,
        buffer: this.#getBufferedRange(),
      });
    });

    this.#audio.addEventListener("play", () => {
      this.#updatePlayerState({
        isPaused: false,
        buffer: this.#getBufferedRange(),
      });
    });

    this.#audio.addEventListener("pause", () => {
      this.#updatePlayerState({
        isPaused: true,
      });
    });
  }

  toggleMute() {
    this.#audio.muted = !this.#audio.muted;

    this.#updatePlayerState({
      isMuted: this.#audio.muted,
    });
  }

  setVolume(volume: number) {
    this.#volume = volume;
    this.#audio.volume = Math.pow(volume, 2.5);

    this.#updatePlayerState({
      volume,
    });
  }

  async toggleShuffle() {
    this.#isShuffleEnabled = !this.#isShuffleEnabled;

    this.#lockAutomaticBufferOperations();
    this.#lockFetchOperations();
    await this.#clearFetchQueues();
    if (this.#isShuffleEnabled) {
      this.#enableShuffle();
    } else {
      this.#disableShuffle();
    }
    this.#unlockAutomaticBufferOperations();
    this.#unlockFetchOperations();

    this.#notifyShuffleRepeatStateChange();
  }

  toggleRepeat() {
    this.#isRepeatEnabled = !this.#isRepeatEnabled;
    this.#notifyShuffleRepeatStateChange();

    if (this.#isRepeatEnabled) {
      this.#enableRepeat();
    }
  }

  #enableRepeat() {
    const currentIndex = this.#getCurrentlyPlayingSongIndex(true);

    if (currentIndex !== null && currentIndex > 0) {
      const lastPe = this.playlist[this.playlist.length - 1];

      if (
        lastPe &&
        lastPe.timestampOffset !== null &&
        lastPe.accurateDuration
      ) {
        this.playlist[0].timestampOffset =
          lastPe.timestampOffset + lastPe.seekOffset + lastPe.accurateDuration;
      }
    }
  }

  #notifyShuffleRepeatStateChange() {
    this.#updatePlayerState({
      isShuffleEnabled: this.#isShuffleEnabled,
      isRepeatEnabled: this.#isRepeatEnabled,
      playlist: this.playlist.map((pe) => pe.song),
      playlistIndex: this.#getCurrentlyPlayingSongIndex(),
    });
  }

  #updatePlayerState(data: Partial<TPlayerState["playerState"]>) {
    usePlayerState.setState({
      playerState: {
        ...usePlayerState.getState().playerState,
        ...data,
      },
    });
  }

  #enableShuffle() {
    const currentIndex = this.#getCurrentlyPlayingSongIndex(true);
    if (currentIndex === null) return;

    // Snapshot original playlist
    this.originalPlaylist = [...this.playlist];

    const currentEntry = this.playlist[currentIndex];

    // Check if next song is buffered
    let nextEntry: PlaylistSong | null = null;
    if (currentIndex + 1 < this.playlist.length) {
      const potentialNext = this.playlist[currentIndex + 1];
      if (
        potentialNext.segments.length > 0 &&
        potentialNext.segments[0]?.bufferInfo
      ) {
        nextEntry = potentialNext;
      }
    }

    const otherEntries = this.playlist.filter(
      (entry) => entry !== currentEntry && entry !== nextEntry,
    );

    const shuffledEntries = shuffleArray(otherEntries);

    // Reconstruct playlist: Current -> (Next) -> Shuffled
    this.playlist = [currentEntry];
    if (nextEntry) {
      this.playlist.push(nextEntry);
    }
    this.playlist.push(...shuffledEntries);

    // Update state to match new reality
    this.#lastPlayingSongIndex = 0;

    // Recalculate offsets for the new order
    // We keep the offset of the current track (it's playing!)
    // We null out others to force recalculation if needed
    for (let i = 1; i < this.playlist.length; i++) {
      this.playlist[i].timestampOffset = null;
    }

    // Immediately update offsets for the sequence
    this.#updateTrackTimestampOffsets(0);
  }

  #disableShuffle() {
    if (!this.originalPlaylist) return;

    const currentIndex = this.#getCurrentlyPlayingSongIndex(true);
    if (currentIndex === null) {
      // Fallback (unlikely)
      this.playlist = this.originalPlaylist;
      this.originalPlaylist = null;
      return;
    }

    const currentEntry = this.playlist[currentIndex];

    this.playlist = this.originalPlaylist;
    this.originalPlaylist = null;

    // Find where the current song is in the original playlist
    const newIndex = this.playlist.findIndex(
      (item) => item.id === currentEntry.id,
    );
    if (newIndex !== -1) {
      this.#lastPlayingSongIndex = newIndex;
      // Keep current entry's timestampOffset as is.
      // Nuke offsets before it (they are technically invalid in timeline now)
      for (let i = 0; i < newIndex; i++) {
        this.playlist[i].timestampOffset = null;
      }
      // Nuke offsets after it and recalculate
      for (let i = newIndex + 1; i < this.playlist.length; i++) {
        this.playlist[i].timestampOffset = null;
      }
      this.#updateTrackTimestampOffsets(newIndex);
    }
  }

  #getNextPlaylistIndex(currentIndex: number): number | null {
    if (currentIndex + 1 < this.playlist.length) {
      return currentIndex + 1;
    }

    if (this.#isRepeatEnabled && this.playlist.length > 0) {
      return 0;
    }

    return null;
  }

  #handleTrackChange(index: number) {
    if (index === this.#lastNotifiedTrackIndex) {
      return;
    }

    // Free memory of tracks that are far away
    let nrSegments = 0;
    for (let i = index + 1; i < this.playlist.length; i++) {
      const nrTrackSegments = this.playlist[i].segments.length;
      if (nrSegments > this.#fetchSizeForward) {
        this.#resetPlaylistEntry(i);
      }

      nrSegments += nrTrackSegments;
    }

    nrSegments = 0;
    const nextIndex = this.#getNextPlaylistIndex(index);
    for (let i = index - 1; i >= (nextIndex === 0 ? 1 : 0); i--) {
      const nrTrackSegments = this.playlist[i].segments.length;
      if (nrSegments > this.#fetchSizeForward) {
        this.#resetPlaylistEntry(i);
      }

      nrSegments += nrTrackSegments;
    }

    this.#lastNotifiedTrackIndex = index;

    console.log("SWITCHED TO", index);
    // this.#maybeLoadPlaylistSong(index + 1);
    this.#notifyTrackChange(index);

    this.#updateTrackTimestampOffsets(index);
  }

  #notifyTrackChange(index: number) {
    usePlayerState.setState({
      song: this.playlist[index].song,
    });

    this.#updatePlayerState({
      currentTime: 0,
      playlistIndex: index,
      timestampOffset: this.playlist[index].timestampOffset,
      seekOffset: this.playlist[index].seekOffset,
    });
  }

  #getBufferedRange(bufferRanges?: { start: number; end: number }[]) {
    const ranges = bufferRanges || this.#getBufferedRanges();

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
    this.#isResetting = true;
    this.#lockAutomaticBufferOperations();

    await this.#clearTrackJumpQueues();
    await this.#clearBufferOperationsQueues();
    await this.#clearFetchQueues();

    for (let i = 0; i < this.playlist.length; i++) {
      this.#resetPlaylistEntry(i);
    }

    await this.#clearSourceBuffer();

    if (this.#sourceBuffer) {
      this.#sourceBuffer.timestampOffset = 0;
    }

    this.#lastNotifiedTrackIndex = null;
    this.#lastPlayingSongIndex = null;

    this.playlist = [];

    this.#unlockAutomaticBufferOperations();
    this.#isResetting = false;
  }

  #getInitialPlaylistSongFromSong(song: Song): PlaylistSong {
    return {
      id: window.crypto.randomUUID(),
      song,
      segments: [],
      timestampOffset: null,
      lastSegmentIndex: null,
      streamId: null,
      seekOffset: 0,
      accurateDuration: null,
    };
  }

  async playSongs(songs: Song[], index: number) {
    this.#audio.pause();
    await this.#reset();

    console.log("Play songs\n\n\n\n\n\n\n");

    this.#lastPlayingSongIndex = index;
    this.playlist = songs.map((song) =>
      this.#getInitialPlaylistSongFromSong(song),
    );

    this.#updatePlayerState({
      playlist: this.playlist.map((pe) => pe.song),
    });

    this.playlist[index].timestampOffset = 0;

    this.#handleTrackChange(index);

    await this.#maybeFetchNextSegment({
      playlistIndex: index,
      segmentIndex: 0,
    });
    await this.#maybeLoadNextSegment({
      playlistIndex: index,
      segmentIndex: 0,
    });

    this.#audio.currentTime = 0;

    if (this.#isShuffleEnabled) {
      this.#enableShuffle();
    }

    await this.#waitForAudioCanPlay();
    this.#audio.play();
  }

  #waitForAudioCanPlay() {
    return new Promise<void>((resolve) => {
      if (this.#audio.readyState >= 3) {
        resolve();
      } else {
        this.#audio.addEventListener("canplay", () => resolve(), {
          once: true,
        });
      }
    });
  }

  #lockFetchOperations() {
    this.#isFetchOperationsLocked = true;
  }

  #unlockFetchOperations() {
    this.#isFetchOperationsLocked = false;
  }

  #lockAutomaticBufferOperations() {
    this.#isBufferOperationsLocked = true;
  }

  #unlockAutomaticBufferOperations() {
    this.#isBufferOperationsLocked = false;
  }

  async #clearBufferOperationsQueues() {
    await this.#bufferOperationsQueue.catch(() => {});
    this.#bufferOperationsQueue = Promise.resolve();
    await this.#waitForBufferReady();
  }

  async #clearFetchQueues() {
    await this.#segmentFetchQueue.catch(() => {});
    this.#segmentFetchQueue = Promise.resolve();
  }

  async #clearTrackJumpQueues() {
    await this.#trackJumpsQueue.catch(() => {});
    this.#trackJumpsQueue = Promise.resolve();
  }

  togglePlayPause() {
    const currentIndex = this.#getCurrentlyPlayingSongIndex(true);
    if (currentIndex === null) {
      return;
    }

    if (this.#audio.paused) {
      this.#audio.play();
    } else {
      this.#audio.pause();
    }
  }

  #resetPlaylistEntryOffsets(index: number) {
    this.playlist[index].timestampOffset = null;
    this.playlist[index].seekOffset = 0;
  }

  async #resetPlaylistEntry(index: number) {
    const pe = { ...this.playlist[index] };
    if (pe && pe.streamId) {
      fetch(`http://localhost:3003/v1/streams/${pe.streamId}/end`)
        .then(() => {
          console.info(`Ended stream ${pe.streamId} (song ${pe.song.title})`);
        })
        .catch((err) => {
          console.error("Error ending stream", pe.streamId, ":", err);
        });
    }

    this.playlist[index].streamId = null;
    this.playlist[index].segments = [];
    this.playlist[index].lastSegmentIndex = null;
    this.playlist[index].timestampOffset = null;
    this.playlist[index].accurateDuration = null;
    this.playlist[index].initSegment = undefined;
    this.playlist[index].seekOffset = 0;
  }

  async #updateTrackTimestampOffsets(startIndex: number) {
    for (let i = startIndex; ; i++) {
      // Stop if we've looped back around
      if (
        i === startIndex - 1 ||
        (startIndex === 0 && i === this.playlist.length - 1)
      ) {
        return;
      }

      const entry = this.playlist[i];
      const nextIndex = this.#getNextPlaylistIndex(i);

      if (nextIndex === null || nextIndex >= this.playlist.length) {
        return;
      }

      if (!entry) {
        return;
      }

      if (
        entry.accurateDuration !== null &&
        entry.lastSegmentIndex !== null &&
        entry.timestampOffset !== null
      ) {
        this.playlist[nextIndex].timestampOffset =
          entry.timestampOffset + entry.accurateDuration + entry.seekOffset;
      } else {
        this.playlist[nextIndex].timestampOffset = null;
      }
    }
  }

  async jumpToTrack(index: number) {
    return this.#enqueueTrackJump(async () => {
      const currentIndex = this.#getCurrentlyPlayingSongIndex(true);
      if (currentIndex === null) {
        return;
      }

      if (index < 0 || index >= this.playlist.length) {
        return;
      }

      await this.#performTrackJump(index, index - currentIndex);
    });
  }

  async #jumpTrack(direction: number) {
    const playlistIndex = this.#getCurrentlyPlayingSongIndex(true);

    if (playlistIndex === null) {
      return;
    }

    let targetIndex = playlistIndex + direction;

    if (this.#isRepeatEnabled) {
      if (targetIndex < 0) {
        targetIndex = this.playlist.length - 1;
      } else if (targetIndex >= this.playlist.length) {
        targetIndex = 0;
      }
    }

    if (targetIndex < 0 || targetIndex >= this.playlist.length) {
      return;
    }

    await this.#performTrackJump(targetIndex, direction);
  }

  async #performTrackJump(targetIndex: number, direction: number) {
    console.log("\n\n\n\n\n\n\nJUMP TRACK");
    const playlistIndex = this.#getCurrentlyPlayingSongIndex(true);

    if (playlistIndex === null) {
      return;
    }

    console.log("Jumping to", targetIndex);

    let pe = this.playlist[playlistIndex];
    let te = this.playlist[targetIndex];
    const segmentIndex =
      te.seekOffset > 0 || te.segments.length === 0 || !te.segments[0]
        ? null
        : 0;

    // When jumping backwards let's just clear all the offsets because repeat functionality
    // can be annoying otherwise (tracks behind can have higher offset than tracks forward)
    if (direction < 0) {
      for (let i = 0; i < this.playlist.length; i++) {
        this.#resetPlaylistEntryOffsets(i);
      }

      pe = this.playlist[playlistIndex];
      te = this.playlist[targetIndex];
    }

    if (segmentIndex === null) {
      // Segment not found
      console.log("Segment not found in buffer or memory, need to fetch.");
      console.log("Jumping to track index", targetIndex);

      this.#lockAutomaticBufferOperations();
      this.#lockFetchOperations();
      await this.#clearBufferOperationsQueues();
      await this.#clearFetchQueues();

      if (this.playlist[playlistIndex].lastSegmentIndex === null) {
        for (let i = playlistIndex; i < this.playlist.length; i++) {
          this.#resetPlaylistEntryOffsets(i);
        }
      }

      if (direction > 0) {
        for (let i = 0; i < this.playlist.length; i++) {
          this.#resetPlaylistEntryOffsets(i);
        }
      }

      this.#resetPlaylistEntry(targetIndex);
      this.playlist[targetIndex].timestampOffset = 0;

      await this.#maybeFetchNextSegment({
        playlistIndex: targetIndex,
        segmentIndex: 0,
        force: true,
      });
      await this.#clearSourceBuffer();
      await this.#maybeLoadNextSegment({
        playlistIndex: targetIndex,
        segmentIndex: 0,
        force: true,
      });

      this.#audio.currentTime = te.timestampOffset || 0;
      this.#unlockAutomaticBufferOperations();
      this.#unlockFetchOperations();
      await this.#waitForAudioCanPlay();
      this.#audio.play();

      this.#notifyTrackChange(targetIndex);

      return;
    }

    const segment = this.playlist[targetIndex].segments[0]!;

    const offset = te.timestampOffset || 0;

    if (segment.bufferInfo) {
      console.log("Segment is in buffer, jumping to it now");
      this.#audio.currentTime = offset;
      this.#audio.play();
      return;
    }

    console.log("Segment not in buffer but in memory");

    if (direction > 0 && te.timestampOffset === null) {
      console.log(
        "Jumping to next track but it doesn't have timestamp offset, need to reset buffer and offsets",
      );

      this.#lockAutomaticBufferOperations();
      this.#lockFetchOperations();
      await this.#clearBufferOperationsQueues();
      await this.#clearFetchQueues();

      this.playlist[targetIndex].timestampOffset = 0;

      for (let i = 0; i < targetIndex; i++) {
        this.playlist[i].timestampOffset = null;
      }

      this.#updateTrackTimestampOffsets(targetIndex);

      await this.#clearSourceBuffer();

      await this.#maybeLoadNextSegment({
        force: true,
        playlistIndex: targetIndex,
        segmentIndex,
      });

      this.#unlockAutomaticBufferOperations();
      this.#unlockFetchOperations();
      this.#audio.currentTime = 0;
      this.#audio.play();

      this.#notifyTrackChange(targetIndex);

      return;
    }

    if (
      direction < 0 &&
      te.lastSegmentIndex !== null &&
      te.accurateDuration !== null
    ) {
      // Re-set current track's offset if the previous track was loaded
      this.playlist[playlistIndex].timestampOffset =
        (te.timestampOffset || 0) + te.accurateDuration;
    } else if (
      // If the previous track wasn't fully loaded yet we need to reset the current track's offset
      direction < 0 &&
      te.timestampOffset === null
    ) {
      for (let i = playlistIndex; i < this.playlist.length; i++) {
        this.playlist[i].timestampOffset = null;
      }
    } else if (
      direction > 0 &&
      (pe.lastSegmentIndex === null || pe.accurateDuration === null)
    ) {
      for (let i = 0; i < this.playlist.length; i++) {
        this.playlist[i].timestampOffset = null;
      }
    }

    if (direction < 0 && te.timestampOffset === null) {
      this.playlist[targetIndex].timestampOffset = 0;
    }

    console.log("Segment is not in buffer but we have the data");
    console.log("Current song is loaded, OK to jump.");
    console.log("Loading segment", segmentIndex);
    console.log("Offset is", offset);
    console.log(
      "Playlist offset of the track is",
      this.playlist[targetIndex].timestampOffset,
    );

    if (te.timestampOffset === null) {
      this.playlist[targetIndex].timestampOffset = 0;
    }

    this.#lockAutomaticBufferOperations();
    this.#lockFetchOperations();
    await this.#clearBufferOperationsQueues();
    await this.#clearFetchQueues();
    await this.#clearSourceBuffer();

    // Segment not in buffer but we have the data
    await this.#maybeLoadNextSegment({
      playlistIndex: targetIndex,
      segmentIndex,
    });

    this.#audio.currentTime = offset;
    this.#unlockAutomaticBufferOperations();
    this.#unlockFetchOperations();

    this.#notifyTrackChange(targetIndex);

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

  addToQueue(song: Song) {
    const entry = this.#getInitialPlaylistSongFromSong(song);
    this.playlist.push(entry);
    if (this.originalPlaylist) {
      this.originalPlaylist.push(entry);
    }
  }

  async playNext(song: Song) {
    const currentIndex = this.#getCurrentlyPlayingSongIndex(true);

    // If nothing is playing, just add to the beginning
    if (currentIndex === null) {
      this.playlist.unshift(this.#getInitialPlaylistSongFromSong(song));
      this.#updatePlayerStatePlaylist();
      return;
    }

    // Check if the existing next track (if any) has segments already in the buffer
    const existingNextTrack = this.playlist[currentIndex + 1];
    const nextTrackHasBufferedSegments =
      existingNextTrack?.segments[0]?.bufferInfo !== undefined;

    if (nextTrackHasBufferedSegments) {
      // The next track already has segments in the buffer (we're near end of current track).
      // To avoid disrupting playback, insert the new song at position currentIndex + 2.
      // The new song will play after the already-buffered next track.
      console.log(
        "Next track already has buffered segments, inserting at position",
        currentIndex + 2,
      );

      const insertIndex = currentIndex + 2;
      const newPlaylistSong = this.#getInitialPlaylistSongFromSong(song);
      this.playlist.splice(insertIndex, 0, newPlaylistSong);

      // Update timestamp offsets for tracks after the current one
      this.#updateTrackTimestampOffsets(currentIndex);

      this.#updatePlayerStatePlaylist();
      return;
    }

    // Normal case: next track is not buffered yet, insert at currentIndex + 1
    const insertIndex = currentIndex + 1;

    this.#lockAutomaticBufferOperations();
    this.#lockFetchOperations();
    await this.#clearBufferOperationsQueues();
    await this.#clearFetchQueues();

    // Clear buffered segments for all tracks after the current one (if any)
    for (let i = insertIndex; i < this.playlist.length; i++) {
      await this.#removeTrackSegmentsFromBuffer(i);

      this.playlist[i].timestampOffset = null;
      this.playlist[i].seekOffset = 0;
    }

    const newPlaylistSong = this.#getInitialPlaylistSongFromSong(song);
    this.playlist.splice(insertIndex, 0, newPlaylistSong);

    // Update timestamp offsets starting from the current track
    this.#updateTrackTimestampOffsets(currentIndex);

    this.#updatePlayerStatePlaylist();

    // Fetch and load the first segment of the new next track
    await this.#maybeFetchNextSegment({
      playlistIndex: insertIndex,
      segmentIndex: 0,
      force: true,
    });

    this.#unlockAutomaticBufferOperations();
    this.#unlockFetchOperations();

    // If we are shuffled, we should also insert this song into the original playlist
    // so it doesn't disappear when we unshuffle.
    // Try to find the current song in the original playlist and insert after it.
    if (this.originalPlaylist) {
      const currentEntry = this.playlist[currentIndex];
      const originalIndex = this.originalPlaylist.findIndex(
        (item) => item.id === currentEntry.id,
      );
      if (originalIndex !== -1) {
        // Insert after current song in original playlist
        this.originalPlaylist.splice(originalIndex + 1, 0, newPlaylistSong);
      } else {
        // Fallback: append to end
        this.originalPlaylist.push(newPlaylistSong);
      }
    }
  }

  async #removeTrackSegmentsFromBuffer(playlistIndex: number) {
    const pe = this.playlist[playlistIndex];

    for (let j = 0; j < pe.segments.length; j++) {
      const segment = pe.segments[j];
      if (segment?.bufferInfo) {
        await this.#waitForBufferReady();
        console.log(
          "Removing from buffer from",
          segment.bufferInfo.start,
          "to",
          segment.bufferInfo.end,
        );
        this.#sourceBuffer.remove(
          segment.bufferInfo.start,
          segment.bufferInfo.end,
        );
        this.playlist[playlistIndex].segments[j]!.bufferInfo = undefined;
        await this.#waitForBufferReady();
      }
    }
  }

  #updatePlayerStatePlaylist() {
    this.#updatePlayerState({
      playlist: this.playlist.map((pe) => pe.song),
    });
  }

  #findSegmentIndexInPlaylistEntry(playlistIndex: number, position: number) {
    const index = this.playlist[playlistIndex].segments.findIndex(
      (seg) => seg && position >= seg.start && position <= seg.end,
    );

    if (index === -1) {
      return null;
    }

    return index;
  }

  async seek(positionPerc: number) {
    if (this.#isSeeking) {
      return;
    }

    this.#isSeeking = true;
    if (positionPerc >= 1) {
      await this.nextTrack();
    } else {
      await this.#seek(positionPerc);
    }

    this.#isSeeking = false;
  }

  async #seek(positionPerc: number) {
    const playlistIndex = this.#getCurrentlyPlayingSongIndex(true);
    if (playlistIndex === null) {
      console.error("Couldn't find currently playing song");
      return;
    }

    // Make sure it's in bounds and not TOO high
    const pe = this.playlist[playlistIndex];

    const position = parseFloat(
      Math.max(
        0,
        Math.min(
          pe.song.duration * positionPerc,
          // Limit max seek to the commit boundary
          pe.song.duration - this.#trackEndCommitBoundary,
        ),
      ).toFixed(1),
    );

    // Adjust position for already seeked position if it exists,
    // because the segments always start at 0
    const offsetPosition = position - pe.seekOffset;
    const targetSegmentIndex = this.#findSegmentIndexInPlaylistEntry(
      playlistIndex,
      offsetPosition,
    );

    console.log("\n\n\n\n\n\n\n\n\n\nSEEK");
    console.log({ position });
    console.log({ seekOffset: pe.seekOffset });
    console.log({ offsetPosition });
    console.log({ targetSegmentIndex });
    console.log({ pe });

    // Found segment
    if (
      targetSegmentIndex !== null &&
      pe.segments[targetSegmentIndex]?.bufferInfo
    ) {
      const seekPos = position + (pe.timestampOffset || 0);
      console.log("Segment is in buffer, seeking to", seekPos);
      this.#audio.currentTime = seekPos;
      this.#updatePlayerState({
        currentTime: seekPos,
      });
      this.#audio.play();
      return;
    }

    if (
      targetSegmentIndex !== null &&
      !pe.segments[targetSegmentIndex]?.bufferInfo
    ) {
      console.log("Segment is in memory, but not buffer, jumping there now!");

      if (this.playlist[playlistIndex].timestampOffset === null) {
        console.error("Timestamp offset is null");
      }

      await this.#maybeLoadNextSegment({
        segmentIndex: targetSegmentIndex,
      });

      const newPos = position + (pe.timestampOffset || 0);
      this.#audio.currentTime = newPos;
      this.#updatePlayerState({
        currentTime: newPos,
      });

      return;
    }

    console.log("Segment not found in buffer or memory, need to fetch.");

    console.log("clearing fetch queues");
    const start = performance.now();
    this.#lockFetchOperations();
    this.#lockAutomaticBufferOperations();
    await this.#clearFetchQueues();
    await this.#clearBufferOperationsQueues();
    console.log("done in", performance.now() - start, "milliseconds");

    const resp = await fetch(
      `http://localhost:3003/v1/streams/${pe.streamId}/seek?position=${position}`,
    );

    // Segment exists on server, we can fetch it now
    if (resp.status === 200) {
      console.log("Segment exists on server, fetching it");
      const json: SeekResponse = await resp.json();

      console.log("stream id", pe.streamId);

      console.log("segment to jump to is", json.segment);
      await this.#maybeFetchNextSegment({
        force: true,
        playlistIndex,
        segmentIndex: json.segment,
      });

      if (
        this.playlist[playlistIndex].lastSegmentIndex === null ||
        this.playlist[playlistIndex].lastSegmentIndex > json.segment + 1
      ) {
        await this.#maybeFetchNextSegment({
          force: true,
          segmentIndex: json.segment + 1,
        });
      } else {
        console.warn("was last segment");
      }

      await this.#maybeLoadNextSegment({
        force: true,
        segmentIndex: json.segment,
      });

      const newPos = position + (pe.timestampOffset || 0);
      this.#audio.currentTime = newPos;
      this.#updatePlayerState({
        currentTime: newPos,
      });

      await this.#waitForAudioCanPlay();
      this.#unlockFetchOperations();
      this.#unlockAutomaticBufferOperations();
      this.#audio.play();

      return;
    }

    // New stream
    if (resp.status === 201) {
      console.warn("Segment doesn't exist on server, starting new stream");
      const json: StreamResponse = await resp.json();

      if (!json.streamId) {
        console.error("no stream id in response");
        return;
      }

      console.log("new stream id", json.streamId);
      this.playlist[playlistIndex].streamId = json.streamId;
      this.playlist[playlistIndex].seekOffset = position;
      this.playlist[playlistIndex].lastSegmentIndex = null;
      this.playlist[playlistIndex].initSegment = undefined;
      this.playlist[playlistIndex].segments = [];
      this.playlist[playlistIndex].accurateDuration = null;

      await this.#clearSourceBuffer();
      await this.#maybeFetchNextSegment({
        force: true,
        position: position,
      });
      await this.#maybeLoadNextSegment({
        force: true,
        segmentIndex: 0,
      });

      const newPos = position + (pe.timestampOffset || 0);
      this.#audio.currentTime = newPos;
      this.#updatePlayerState({
        currentTime: newPos,
      });

      await this.#waitForAudioCanPlay();
      this.#unlockFetchOperations();
      this.#unlockAutomaticBufferOperations();
      this.#audio.play();

      return;
    }

    console.error("Resp bad status:", resp.status);
    console.error({ resp });

    this.#unlockFetchOperations();
  }

  async seekForward() {
    const playlistIndex = this.#getCurrentlyPlayingSongIndex(true);
    if (playlistIndex === null) return;
    const pe = this.playlist[playlistIndex];
    if (!pe) return;

    const duration = pe.accurateDuration || pe.song.duration;
    if (!duration) return;

    // Current time relative to the start of the track
    const currentTimeInTrack =
      this.#audio.currentTime - (pe.timestampOffset || 0);

    const newTime = currentTimeInTrack + 5;
    const newPerc = newTime / duration;

    this.seek(newPerc);
  }

  async seekBackward() {
    const playlistIndex = this.#getCurrentlyPlayingSongIndex(true);
    if (playlistIndex === null) return;
    const pe = this.playlist[playlistIndex];
    if (!pe) return;

    const duration = pe.accurateDuration || pe.song.duration;
    if (!duration) return;

    // Current time relative to the start of the track
    const currentTimeInTrack =
      this.#audio.currentTime - (pe.timestampOffset || 0);

    const newTime = currentTimeInTrack - 5;
    const newPerc = newTime / duration;
    this.seek(newPerc);
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
        if (this.playlist[i].segments[j]) {
          this.playlist[i].segments[j]!.bufferInfo = undefined;
        }
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
    const startIndex =
      this.#isRepeatEnabled && currentIndex === 0
        ? this.playlist.length - 1
        : currentIndex - 1;
    for (
      let i = startIndex, count = 0;
      count < 3 && i < this.playlist.length;
      i = this.#getNextPlaylistIndex(i) ?? Number.MAX_SAFE_INTEGER, count++
    ) {
      if (i < 0 || i >= this.playlist.length) {
        continue;
      }

      const pe = this.playlist[i];
      for (let j = 0; j < pe.segments.length; j++) {
        const segment = pe.segments[j];

        if (!segment?.bufferInfo) {
          continue;
        }

        if (
          currentTime >= segment.bufferInfo.start - this.#bufferSizeBehind &&
          currentTime <= segment.bufferInfo.end + this.#bufferSizeForward
        ) {
          continue;
        }

        await this.#waitForBufferReady();

        this.#sourceBuffer.remove(
          segment.bufferInfo.start,
          segment.bufferInfo.end,
        );

        await this.#waitForBufferReady();
        this.playlist[i].segments[j]!.bufferInfo = undefined;
        nrRemovedSegments++;
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

    return await this.#enqueueBufferOperation(async () => {
      await this.#loadNextSegment(options);
    });
  }

  async #loadNextSegment(options?: {
    playlistIndex?: number;
    segmentIndex?: number;
    force?: boolean;
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
        : this.#findSegmentIndexInPlaylistEntry(playlistIndex, offsetPosition);

    if (segmentIndex === null) {
      console.log("Couldn't find segment index, probably not loaded");
      console.log({ pe });
      return;
    }

    // Store the starting track info to check proximity to track end
    const startingPe = this.playlist[playlistIndex];
    const startingTrackEnd =
      (startingPe.timestampOffset || 0) +
      startingPe.seekOffset +
      (startingPe.accurateDuration || startingPe.song.duration);

    // Let's not append segments that are already in the buffer (might happen due to seeking)
    while (
      playlistIndex < this.playlist.length &&
      segmentIndex < pe.segments.length &&
      pe.segments[segmentIndex]?.bufferInfo
    ) {
      segmentIndex++;

      if (
        segmentIndex >= pe.segments.length &&
        pe.lastSegmentIndex !== null &&
        segmentIndex > pe.lastSegmentIndex
      ) {
        // Only advance to the next track if we're within 0.7s of the current track's end
        // This prevents pre-decoding of next track audio too early, which would cause
        // issues if playNext is called near the end of the current track.
        const timeUntilTrackEnd = startingTrackEnd - this.#audio.currentTime;
        if (
          !options?.force &&
          timeUntilTrackEnd > this.#trackEndCommitBoundary
        ) {
          return;
        }

        const nextIndex = this.#getNextPlaylistIndex(playlistIndex);
        if (nextIndex === null) {
          return;
        }

        playlistIndex = nextIndex;
        pe = this.playlist[playlistIndex];
        segmentIndex = 0;
      }
    }

    if (playlistIndex >= this.playlist.length) {
      return;
    }

    if (segmentIndex >= pe.segments.length) {
      if (pe.lastSegmentIndex !== null) {
        console.error("Can't load another segment for unknown reason");
      }
      return;
    }

    if (!pe.segments[segmentIndex]) {
      console.error(
        "segment",
        segmentIndex,
        "doesn't exist on playlist entry",
        pe,
      );
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

    const segment = pe.segments[segmentIndex]!;

    const bufferRangesBefore = this.#getBufferedRanges();

    console.log("appending playlist", playlistIndex, "segment", segmentIndex);

    console.log({ playlist: this.playlist });

    this.#sourceBuffer.timestampOffset = pe.timestampOffset + pe.seekOffset;
    this.#sourceBuffer.appendBuffer(segment.data);

    await this.#waitForBufferReady();

    const bufferRangesAfter = this.#getBufferedRanges();

    if (bufferRangesAfter.length === 0) {
      console.error("no buffer after appending");
      return;
    }

    let segmentStart: number | null = null;
    let segmentEnd: number | null = 0;
    if (bufferRangesBefore.length === bufferRangesAfter.length) {
      for (let i = 0; i < bufferRangesBefore.length; i++) {
        const before = bufferRangesBefore[i];
        const after = bufferRangesAfter[i];

        if (after.start < before.start) {
          segmentStart = after.start;
          segmentEnd = before.start;
          break;
        }

        if (after.end > before.end) {
          segmentStart = before.end;
          segmentEnd = after.end;
          break;
        }
      }
    } else {
      for (const range of bufferRangesAfter) {
        const beforeRange = bufferRangesBefore.find(
          (r) =>
            r.start === range.start ||
            r.start === range.end ||
            r.end === range.start ||
            r.end === range.end,
        );

        if (!beforeRange) {
          segmentStart = range.start;
          segmentEnd = range.end;
          break;
        }
      }
    }

    if (
      segmentStart !== null &&
      segmentEnd !== null &&
      this.playlist[playlistIndex].segments[segmentIndex]
    ) {
      this.playlist[playlistIndex].segments[segmentIndex]!.bufferInfo = {
        start: segmentStart,
        end: segmentEnd,
        duration: segmentEnd - segmentStart,
      };
    }
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
    }

    return 0;
  }

  #getNrFetchedFutureSegments() {
    let playlistIndex = this.#getCurrentlyPlayingSongIndex();
    if (playlistIndex === null) {
      return 0;
    }

    let pe = this.playlist[playlistIndex];

    const position = this.#audio.currentTime;

    // Adjust position for already seeked position if it exists,
    // because the segments always start at 0
    const offsetPosition = position - pe.seekOffset - (pe.timestampOffset || 0);
    let segmentIndex = this.#findSegmentIndexInPlaylistEntry(
      playlistIndex,
      offsetPosition,
    );

    if (segmentIndex === null) {
      console.log("Couldn't find segment index, probably not loaded");
      return null;
    }

    let nrSegments = 0;
    // Let's not append segments that are already in the buffer (might happen due to seeking)
    while (
      playlistIndex < this.playlist.length &&
      segmentIndex < pe.segments.length &&
      pe.segments[segmentIndex]
    ) {
      nrSegments++;
      segmentIndex++;

      if (
        segmentIndex >= pe.segments.length &&
        pe.lastSegmentIndex !== null &&
        segmentIndex > pe.lastSegmentIndex
      ) {
        const nextIndex = this.#getNextPlaylistIndex(playlistIndex);
        if (nextIndex === null) {
          break;
        }

        playlistIndex = nextIndex;
        pe = this.playlist[playlistIndex];
        segmentIndex = 0;
      }
    }

    return nrSegments;
  }

  async #fetchTrackSegment(
    streamId: string,
    playlistIndex: number,
    segment: number,
  ) {
    const initResp =
      segment === 0
        ? fetch(
            `http://localhost:3003/v1/streams/${streamId}/segments/init.mp4`,
            { cache: "no-store", headers: { "Cache-Control": "no-cache" } },
          )
        : null;

    const segmentResp = fetch(
      `http://localhost:3003/v1/streams/${streamId}/segments/segment${segment}.mp4`,
      { cache: "no-store" },
    );

    try {
      var resps = await Promise.all([initResp, segmentResp]);
    } catch (err) {
      console.warn(err);
      return null;
    }

    if (resps[0] && resps[0].status !== 200 && resps[0].status !== 202) {
      return null;
    }

    if (resps[1].status !== 200 && resps[1].status !== 202) {
      return null;
    }

    // Segment isn't available yet
    const segmentBuffer = await resps[1].arrayBuffer();

    if (!resps[0]) {
      return {
        data: new Uint8Array([
          ...this.playlist[playlistIndex].initSegment!,
          ...new Uint8Array(segmentBuffer),
        ]),
        isLastSegment: resps[1].headers.get("X-Last-Segment") === "true",
      };
    }

    const initBuffer = await resps[0].arrayBuffer();
    const initArray = new Uint8Array(initBuffer);

    this.playlist[playlistIndex].initSegment = initArray;

    return {
      data: new Uint8Array([...initArray, ...new Uint8Array(segmentBuffer)]),
      isLastSegment: resps[1].headers.get("X-Last-Segment") === "true",
    };
  }

  async #maybeFetchNextSegment(options?: {
    playlistIndex?: number;
    segmentIndex?: number;
    force?: boolean;
    position?: number;
  }) {
    const nrSegments = this.#getNrFetchedFutureSegments();
    if (!options?.force && nrSegments && nrSegments > this.#fetchSizeForward) {
      return;
    }

    return await this.#enqueueSegmentFetch(async () => {
      await this.#fetchNextSegment(options);
    });
  }

  async #fetchNextSegment(options?: {
    playlistIndex?: number;
    segmentIndex?: number;
    force?: boolean;
    position?: number;
  }) {
    let playlistIndex =
      options?.playlistIndex ?? this.#getCurrentlyPlayingSongIndex(true);

    if (
      playlistIndex === null ||
      playlistIndex < 0 ||
      playlistIndex >= this.playlist.length
    ) {
      return;
    }

    if (
      options?.segmentIndex !== undefined &&
      this.playlist[playlistIndex].segments[options.segmentIndex]
    ) {
      console.warn(
        "Segment index",
        options.segmentIndex,
        "was set for fetch but the segment already exists",
      );
      return;
    }

    let pe = this.playlist[playlistIndex];
    let segmentIndex =
      options?.segmentIndex ??
      this.#findSegmentIndexInPlaylistEntry(
        playlistIndex,
        options?.position ??
          this.#audio.currentTime - pe.seekOffset - (pe.timestampOffset || 0),
      );

    if (segmentIndex === null) {
      segmentIndex = 0;
    }

    while (
      playlistIndex < this.playlist.length &&
      pe.segments[segmentIndex] &&
      (pe.lastSegmentIndex === null || segmentIndex <= pe.lastSegmentIndex)
    ) {
      segmentIndex++;

      if (pe.lastSegmentIndex && segmentIndex > pe.lastSegmentIndex) {
        const nextIndex = this.#getNextPlaylistIndex(playlistIndex);
        if (nextIndex === null) {
          return;
        }

        playlistIndex = nextIndex;
        segmentIndex = 0;
        pe = this.playlist[playlistIndex];
        continue;
      }
    }

    if (playlistIndex >= this.playlist.length) {
      return;
    }

    if (!pe.streamId) {
      console.log("stream id not found, fetching stream");
      const streamResp = await fetch(
        `http://localhost:3003/v1/tracks/${this.playlist[playlistIndex].song.id}/stream`,
        { cache: "no-store" },
      );
      if (streamResp.status !== 201) {
        console.error("woops");
        return;
      }

      const json: StreamResponse = await streamResp.json();
      this.playlist[playlistIndex].streamId = json.streamId;
      console.log("stream id", json.streamId);
      pe = this.playlist[playlistIndex];
    }

    console.log("fetching playlist", playlistIndex, "segment", segmentIndex);
    const result = await this.#fetchTrackSegment(
      pe.streamId!,
      playlistIndex,
      segmentIndex,
    );
    console.log("done fetching segment", segmentIndex);
    if (!result) {
      console.error(
        "error fetching track segment",
        segmentIndex,
        "for playlist entry",
        pe,
      );
      return;
    }

    await new Promise<void>((resolve) => {
      const mp4boxfile: mp4box.ISOFile = mp4box.createFile();

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

      let timescale = 1;

      mp4boxfile.onReady = (info) => {
        if (info.tracks.length === 0 || info.tracks[0].nb_samples === 0) {
          console.warn(
            "Playlist index",
            playlistIndex,
            "segment",
            segmentIndex,
            "has no data",
          );

          console.warn("Stream id is", pe.streamId);

          if (!result.isLastSegment) {
            console.error("It isn't the last segment either");
            resolve();
            return;
          }

          if (segmentIndex === 0) {
            console.error("Segment index is 0");
            resolve();
            return;
          }

          console.log("Skipping segment and setting previous segment as last");

          if (!this.playlist[playlistIndex].segments[segmentIndex - 1]) {
            console.error("Last segment doesn't exist");
            return;
          }

          this.#handleSegmentPostLoad(playlistIndex, segmentIndex - 1, true);

          mp4boxfile.flush();
          resolve();
        }

        info.tracks.forEach((track) => {
          timescale = track.timescale;
          mp4boxfile.setExtractionOptions(track.id, null, {
            nbSamples: Infinity,
          });
          mp4boxfile.start();
        });
      };

      mp4boxfile.onError = (err) => {
        console.error("MP4BOXFILE ERROR", err);
      };

      mp4boxfile.onSamples = (_, __, samples) => {
        this.#handleMp4boxfileSamples(
          samples,
          result.data,
          playlistIndex,
          segmentIndex,
          timescale,
          result.isLastSegment,
        );

        mp4boxfile.flush();
        resolve();
      };

      const buffer = result.data.buffer as mp4box.MP4BoxBuffer;
      buffer.fileStart = 0;

      mp4boxfile.appendBuffer(buffer);
    });
  }

  #handleMp4boxfileSamples(
    samples: mp4box.Sample[],
    data: Uint8Array<ArrayBuffer>,
    playlistIndex: number,
    segmentIndex: number,
    timescale: number,
    isLastSegment: boolean,
  ) {
    if (samples.length > 0) {
      const firstSample = samples[0];
      const lastSample = samples[samples.length - 1];

      const startTime = firstSample.cts / timescale;
      const endTime = (lastSample.cts + lastSample.duration) / timescale;

      this.playlist[playlistIndex].segments[segmentIndex] = {
        data: data,
        start: startTime,
        end: endTime,
        duration: endTime - startTime,
      };
    }

    this.#handleSegmentPostLoad(playlistIndex, segmentIndex, isLastSegment);
  }

  #handleSegmentPostLoad(
    playlistIndex: number,
    segmentIndex: number,
    isLastSegment: boolean,
  ) {
    let pe = this.playlist[playlistIndex];

    const endTime = this.playlist[playlistIndex].segments[segmentIndex]?.end;

    if (endTime === undefined) {
      console.error("End time is not defined");
      return;
    }

    if (isLastSegment) {
      this.playlist[playlistIndex].lastSegmentIndex = segmentIndex;
      this.playlist[playlistIndex].accurateDuration = endTime;

      const nextIndex = this.#getNextPlaylistIndex(playlistIndex);

      if (nextIndex !== null && pe.timestampOffset !== null) {
        this.playlist[nextIndex].timestampOffset =
          pe.timestampOffset + pe.seekOffset + endTime;
      }
    }
  }
}
