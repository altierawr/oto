PRAGMA FOREIGN_KEYS = OFF;

CREATE TABLE IF NOT EXISTS favorite_tracks_new (
  user_id TEXT NOT NULL,
  track_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, track_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tidal_tracks(id)
);

INSERT INTO favorite_tracks_new SELECT * FROM favorite_tracks;

DROP TABLE favorite_tracks;
ALTER TABLE favorite_tracks_new RENAME TO favorite_tracks;

CREATE TABLE IF NOT EXISTS playlist_tracks_new (
  playlist_id INTEGER NOT NULL,
  track_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (playlist_id, track_id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tidal_tracks(id)
);

INSERT INTO playlist_tracks_new SELECT * FROM playlist_tracks;

DROP TABLE playlist_tracks;
ALTER TABLE playlist_tracks_new RENAME TO playlist_tracks;

PRAGMA FOREIGN_KEYS = ON;
