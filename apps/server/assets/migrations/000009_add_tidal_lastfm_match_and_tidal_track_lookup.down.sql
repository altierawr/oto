DROP INDEX IF EXISTS idx_tidal_tracks_artist_title;

ALTER TABLE tidal_tracks
  DROP COLUMN title;

ALTER TABLE tidal_tracks
  DROP COLUMN artist_name;

ALTER TABLE tidal_lastfm_recommendations
  DROP COLUMN match;
