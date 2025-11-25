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

type TPlayerState = {
  player: MusicPlayer;
  playInfo?: {
    song: MusicPlayerSong;
    currentTime: number;
    isPaused: boolean;
    isBuffering: boolean;
    buffer: {
      from: number;
      to: number;
    } | null;
    timestampOffset: number | null;
    playlist: MusicPlayerSong[];
    playlistIndex: number;
  };
};

export const usePlayerState = create<TPlayerState>(() => ({
  player: new MusicPlayer(),
}));
