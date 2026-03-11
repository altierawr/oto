ALTER TABLE tidal_tracks ADD COLUMN canonical_primary_artist_name TEXT NOT NULL DEFAULT '';
ALTER TABLE tidal_tracks ADD COLUMN canonical_title TEXT NOT NULL DEFAULT '';
ALTER TABLE tidal_tracks ADD COLUMN canonical_track_key TEXT NOT NULL DEFAULT '';
ALTER TABLE tidal_tracks ADD COLUMN canonical_album_title TEXT NOT NULL DEFAULT '';
ALTER TABLE tidal_tracks ADD COLUMN canonical_album_key TEXT NOT NULL DEFAULT '';
ALTER TABLE tidal_tracks ADD COLUMN album_track_count INTEGER;

UPDATE tidal_tracks
SET
  canonical_primary_artist_name = LOWER(TRIM(COALESCE(artist_name, ''))),
  canonical_title = LOWER(TRIM(COALESCE(title, ''))),
  canonical_track_key = LOWER(TRIM(COALESCE(artist_name, ''))) || '|' || LOWER(TRIM(COALESCE(title, ''))),
  canonical_album_title = LOWER(TRIM(COALESCE(json_extract(payload, '$.album.title'), ''))),
  canonical_album_key = LOWER(TRIM(COALESCE(artist_name, ''))) || '|' || LOWER(TRIM(COALESCE(json_extract(payload, '$.album.title'), ''))),
  album_track_count = CAST(json_extract(payload, '$.album.numberOfTracks') AS INTEGER);

CREATE INDEX IF NOT EXISTS idx_tidal_tracks_canonical_track_key ON tidal_tracks(canonical_track_key);
CREATE INDEX IF NOT EXISTS idx_tidal_tracks_canonical_album_key ON tidal_tracks(canonical_album_key);
CREATE INDEX IF NOT EXISTS idx_tidal_tracks_canonical_artist_name ON tidal_tracks(canonical_primary_artist_name);

-- Plays lookup for user + autoplay split.
CREATE INDEX IF NOT EXISTS idx_plays_user_autoplay_track ON plays(user_id, is_autoplay, track_id);
