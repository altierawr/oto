DELETE FROM tidal_lastfm_recommendations;
DELETE FROM lastfm_tracks;

ALTER TABLE lastfm_tracks ADD COLUMN album_title TEXT;
ALTER TABLE lastfm_tracks ADD COLUMN album_mbid TEXT;
