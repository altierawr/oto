DROP INDEX IF EXISTS idx_plays_user_autoplay_track;
DROP INDEX IF EXISTS idx_tidal_tracks_canonical_artist_name;
DROP INDEX IF EXISTS idx_tidal_tracks_canonical_album_key;
DROP INDEX IF EXISTS idx_tidal_tracks_canonical_track_key;

ALTER TABLE tidal_tracks DROP COLUMN album_track_count;
ALTER TABLE tidal_tracks DROP COLUMN canonical_album_key;
ALTER TABLE tidal_tracks DROP COLUMN canonical_album_title;
ALTER TABLE tidal_tracks DROP COLUMN canonical_track_key;
ALTER TABLE tidal_tracks DROP COLUMN canonical_title;
ALTER TABLE tidal_tracks DROP COLUMN canonical_primary_artist_name;
