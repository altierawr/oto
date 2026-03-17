ALTER TABLE tidal_tracks ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;

UPDATE tidal_tracks SET created_at = unixepoch();
