CREATE TABLE IF NOT EXISTS favorite_tracks_new (
  user_id TEXT NOT NULL,
  track_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, track_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO favorite_tracks_new (user_id, track_id, created_at)
SELECT favorite_tracks.user_id, favorite_tracks.track_id, favorite_tracks.created_at
FROM favorite_tracks;

DROP TABLE favorite_tracks;
ALTER TABLE favorite_tracks_new RENAME TO favorite_tracks;

CREATE INDEX IF NOT EXISTS idx_favorite_tracks_track_id ON favorite_tracks(track_id);
