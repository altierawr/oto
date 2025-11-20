import { create } from "zustand";
import { MusicPlayer } from "./music-player";

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
};

export const usePlayerState = create<TPlayerState>(() => ({
  player: new MusicPlayer(),
}));
