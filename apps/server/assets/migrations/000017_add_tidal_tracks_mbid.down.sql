ALTER TABLE lastfm_tracks DROP COLUMN mbid;

DROP INDEX IF EXISTS lastfm_tracks_mbid;
DROP INDEX IF EXISTS lastfm_tracks_artist_name;
DROP INDEX IF EXISTS lastfm_tracks_title;
