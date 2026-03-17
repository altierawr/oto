ALTER TABLE lastfm_tracks ADD COLUMN mbid TEXT;

CREATE INDEX IF NOT EXISTS lastfm_tracks_mbid ON lastfm_tracks(mbid);
CREATE INDEX IF NOT EXISTS lastfm_tracks_artist_name ON lastfm_tracks(artist_name);
CREATE INDEX IF NOT EXISTS lastfm_tracks_title ON lastfm_tracks(title);
