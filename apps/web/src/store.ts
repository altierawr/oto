import { create } from "zustand";

export type TLocation = "home" | "artists" | "albums";

type TLocationState = {
  location: TLocation;
  setLocation: (location: TLocation) => void;
};

export const useLocationStore = create<TLocationState>((set) => ({
  location: "home",
  setLocation: (location: TLocation) => set({ location }),
}));
