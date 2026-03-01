ALTER TABLE tidal_lastfm_recommendations
  ADD COLUMN match REAL NOT NULL DEFAULT 0;

ALTER TABLE tidal_tracks
  ADD COLUMN artist_name TEXT NOT NULL DEFAULT '';

ALTER TABLE tidal_tracks
  ADD COLUMN title TEXT NOT NULL DEFAULT '';

UPDATE tidal_tracks
SET artist_name = COALESCE(json_extract(payload, '$.artists[0].name'), artist_name),
    title = COALESCE(json_extract(payload, '$.title'), title);

CREATE INDEX IF NOT EXISTS idx_tidal_tracks_artist_title
  ON tidal_tracks(artist_name, title);
