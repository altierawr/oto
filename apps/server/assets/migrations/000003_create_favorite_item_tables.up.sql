CREATE TABLE IF NOT EXISTS tidal_artists (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tidal_albums (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tidal_tracks (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_favorite_artists_artist_id ON favorite_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_favorite_albums_album_id ON favorite_albums(album_id);
CREATE INDEX IF NOT EXISTS idx_favorite_tracks_track_id ON favorite_tracks(track_id);
