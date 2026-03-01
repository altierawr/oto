CREATE TABLE IF NOT EXISTS lastfm_tracks (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  duration INTEGER,
  artist_name text NOT NULL,
  artist_mbid TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX idx_lastfm_tracks_unique
  ON lastfm_tracks(title, COALESCE(duration, -1), artist_name, COALESCE(artist_mbid, ''));

CREATE TABLE IF NOT EXISTS tidal_lastfm_recommendations (
  tidal_track_id INTEGER NOT NULL REFERENCES tidal_tracks(id) ON DELETE CASCADE,
  lastfm_track_id INTEGER NOT NULL REFERENCES lastfm_tracks(id) ON DELETE CASCADE,
  PRIMARY KEY (tidal_track_id, lastfm_track_id)
);
