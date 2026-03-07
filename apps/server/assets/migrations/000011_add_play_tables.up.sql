CREATE TABLE plays (
  track_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  is_autoplay INTEGER NOT NULL DEFAULT 0,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  FOREIGN KEY (track_id) REFERENCES tidal_tracks(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
