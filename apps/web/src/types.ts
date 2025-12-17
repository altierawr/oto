export type Album = {
  id: number;
  cover: string;
  explicit?: boolean;
  duration: number;
  numberOfTracks: number;
  numberOfVolumes: number;
  releaseDate: string;
  title: string;
  type: "ALBUM" | "EP" | "SINGLE";
  upc?: string;
  vibrantColor?: string;
  videoCover?: string;
  songs?: Song[];
  artists: Artist[];
};

export type Artist = {
  id: number;
  name: string;
  picture?: string;
};

export type Song = {
  id: number;
  bpm: number;
  duration: number;
  explicit?: boolean;
  isrc?: string;
  streamStartDate: string;
  title: string;
  trackNumber: number;
  volumeNumber: number;
  artists: Artist[];
  albumId: number;
  albumTitle: string;
  albumCover: string;
};

export type MusicPlayerSong = Song & {
  progress?: number;
};
