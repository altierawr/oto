CREATE TABLE user_recommended_artists (
  user_id TEXT NOT NULL,
  artist_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, artist_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (artist_id) REFERENCES tidal_artists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_recommended_artists_user_id ON user_recommended_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommended_artists_artist_id ON user_recommended_artists(artist_id);

CREATE TABLE user_recommended_albums (
  user_id TEXT NOT NULL,
  album_id INTEGER NOT NULL,
  album_recommended_from_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, album_id, album_recommended_from_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (album_id) REFERENCES tidal_albums(id) ON DELETE CASCADE,
  FOREIGN KEY (album_recommended_from_id) REFERENCES tidal_albums(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_recommended_albums_user_id ON user_recommended_albums(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommended_albums_album_id ON user_recommended_albums(album_id);
CREATE INDEX IF NOT EXISTS idx_user_recommended_albums_album_recommended_from_id ON user_recommended_albums(album_recommended_from_id);

CREATE TABLE user_recommended_tracks (
  user_id TEXT NOT NULL,
  track_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, track_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tidal_tracks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_recommended_tracks_user_id ON user_recommended_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommended_track_track_id ON user_recommended_tracks(track_id);

CREATE INDEX IF NOT EXISTS idx_plays_user_id ON plays(user_id);
CREATE INDEX IF NOT EXISTS idx_plays_track_id ON plays(track_id);
