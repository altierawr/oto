CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expiry INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_tracks (
  session_id TEXT NOT NULL,
  track_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, track_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tidal_tracks(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_tracks_track_id ON session_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_session_tracks_session_id ON session_tracks(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_tracks_session_position ON session_tracks(session_id, position);
