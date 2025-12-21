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

export type ArtistPage = Artist & {
  selectedAlbumCoverFallback?: string;
  biography?: string;
  albums?: Album[];
  compilations?: Album[];
  appearsOn?: Album[];
  topSingles?: Album[];
  topTracks?: Song[];
  similarArtists?: Artist[];
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
  album: Album;
};

export type Playlist = {
  uuid: string;
  created: string;
  description: string;
  popularity: number;
  duration: number;
  lastItemAddedAt: string;
  lastUpdated: string;
  numberOfAudioTracks: number;
  numberOfTracks: number;
  promotedArtists: Artist[];
  publicPlaylist: boolean;
  title: string;
  squareImage?: string;
  type: string;
};

export type SearchResults = {
  topHits: {
    type: "ARTISTS" | "ALBUMS" | "TRACKS" | "PLAYLISTS";
    value: Artist | Album | Song | Playlist;
  }[];
  artists: Artist[];
  albums: Album[];
  songs: Song[];
  playlists: Playlist[];
};

export type MusicPlayerSong = Song & {
  progress?: number;
};
