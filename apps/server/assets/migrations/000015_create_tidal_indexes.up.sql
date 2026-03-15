DROP INDEX IF EXISTS idx_tidal_tracks_artist_title;
DROP INDEX IF EXISTS idx_tidal_tracks_canonical_track_key;
DROP INDEX IF EXISTS idx_tidal_tracks_canonical_album_key;
DROP INDEX IF EXISTS idx_tidal_tracks_canonical_artist_name;

CREATE INDEX IF NOT EXISTS idx_tidal_tracks_artist_id ON tidal_tracks(artist_id);
CREATE INDEX IF NOT EXISTS idx_tidal_tracks_album_id ON tidal_tracks(album_id);

CREATE INDEX IF NOT EXISTS idx_tidal_albums_artist_id ON tidal_albums(artist_id);
