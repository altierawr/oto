export type Album = {
  id: number;
  title: string;
  cover: string;
  videoCover: string;
  songs: Song[];
  artists: Artist[];
};

export type Artist = {
  id: number;
  name: string;
  picture: string;
};

export type Song = {
  id: number;
  title: string;
  duration: number;
  explicit: boolean;
  trackNumber: number;
  year: string;
  artistId: number;
  artistName: string;
  artistPicture: string;
  albumId: number;
  albumTitle: string;
  albumCover: string;
};
