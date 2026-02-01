import { create } from "zustand";
import { MusicPlayer } from "./music-player";
import type { MusicPlayerSong } from "./types";

export type TLocation = "home" | "artists" | "albums";

type TLocationState = {
  location: TLocation;
  setLocation: (location: TLocation) => void;
};

export const useLocationStore = create<TLocationState>((set) => ({
  location: "home",
  setLocation: (location: TLocation) => set({ location }),
}));

export type TPlayerState = {
  player: MusicPlayer;
  song: MusicPlayerSong | null;
  playerState: {
    volume: number;
    isMuted: boolean;
    isPaused: boolean;
    isBuffering: boolean;
    isJumping: boolean;
    seekOffset: number;
    playlist: MusicPlayerSong[];
    isShuffleEnabled: boolean;
    isRepeatEnabled: boolean;
    playlistIndex: number | null;
    timestampOffset: number | null;
    currentTime: number | null;
    buffer: {
      from: number;
      to: number;
    } | null;
  };
};

export const usePlayerState = create<TPlayerState>(() => ({
  player: new MusicPlayer(),
  song: null,
  playerState: MusicPlayer.getInitialPlayerState(),
}));

type TGeneralStore = {
  isSongQueueVisible: boolean;
  setIsSongQueueVisible: (isSongQueueVisible: boolean) => void;
};

export const useGeneralStore = create<TGeneralStore>((set) => ({
  isSongQueueVisible: false,
  setIsSongQueueVisible: (isSongQueueVisible: boolean) =>
    set({ isSongQueueVisible }),
}));
