-- albums have often not been inserted and so many tracks will be missing an album. same with artists
PRAGMA FOREIGN_KEYS = OFF;

CREATE TABLE IF NOT EXISTS tidal_tracks_new (
  id INTEGER PRIMARY KEY NOT NULL,
  bpm INTEGER,
  duration INTEGER NOT NULL,
  explicit INTEGER NOT NULL DEFAULT 0,
  isrc TEXT,
  stream_start_date TEXT,
  title TEXT NOT NULL,
  track_number INTEGER,
  volume_number INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  artist_id INTEGER NOT NULL,
  album_id INTEGER NOT NULL,
  FOREIGN KEY (artist_id) REFERENCES tidal_artists(id) ON DELETE CASCADE,
  FOREIGN KEY (album_id) REFERENCES tidal_albums(id) ON DELETE CASCADE
);

INSERT INTO tidal_tracks_new (id, bpm, duration, explicit, isrc, stream_start_date, title, track_number, volume_number, artist_id, album_id)
SELECT
  id,
  json_extract(payload, '$.bpm'),
  json_extract(payload, '$.duration'),
  COALESCE(json_extract(payload, '$.explicit'), 0),
  json_extract(payload, '$.isrc'),
  json_extract(payload, '$.StreamStartDate'),
  json_extract(payload, '$.title'),
  json_extract(payload, '$.trackNumber'),
  json_extract(payload, '$.volumeNumber'),
  json_extract(payload, '$.artists[0].id'),
  json_extract(payload, '$.album.id')
FROM tidal_tracks
WHERE json_extract(payload, '$.artists[0].id') IS NOT NULL
  AND json_extract(payload, '$.album.id') IS NOT NULL
  AND json_extract(payload, '$.title') IS NOT NULL;

DROP TABLE IF EXISTS tidal_tracks;
ALTER TABLE tidal_tracks_new RENAME TO tidal_tracks;

CREATE TABLE IF NOT EXISTS tidal_albums_new (
  id INTEGER PRIMARY KEY NOT NULL,
  cover TEXT,
  duration INTEGER,
  explicit INTEGER NOT NULL DEFAULT 0,
  number_of_tracks INTEGER,
  number_of_volumes INTEGER,
  release_date TEXT,
  title TEXT NOT NULL,
  type TEXT,
  upc TEXT,
  vibrant_color TEXT,
  video_cover TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  artist_id INTEGER NOT NULL,
  FOREIGN KEY (artist_id) REFERENCES tidal_artists(id) ON DELETE CASCADE
);

INSERT INTO tidal_albums_new (
  id, cover, duration, explicit, number_of_tracks, number_of_volumes,
  release_date, title, type, upc, vibrant_color, video_cover, artist_id
)
SELECT
  id,
  json_extract(payload, '$.cover'),
  json_extract(payload, '$.duration'),
  COALESCE(json_extract(payload, '$.explicit'), 0),
  json_extract(payload, '$.numberOfTracks'),
  json_extract(payload, '$.numberOfVolumes'),
  json_extract(payload, '$.releaseDate'),
  json_extract(payload, '$.title'),
  json_extract(payload, '$.type'),
  json_extract(payload, '$.upc'),
  json_extract(payload, '$.vibrantColor'),
  json_extract(payload, '$.videoCover'),
  json_extract(payload, '$.artists[0].id')
FROM tidal_albums
WHERE json_extract(payload, '$.artists[0].id') IS NOT NULL
  AND json_extract(payload, '$.title') IS NOT NULL;

DROP TABLE IF EXISTS tidal_albums;
ALTER TABLE tidal_albums_new RENAME TO tidal_albums;

CREATE TABLE IF NOT EXISTS tidal_artists_new (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  selected_album_cover_fallback TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO tidal_artists_new (id, name, picture, selected_album_cover_fallback)
SELECT
  id,
  json_extract(payload, '$.name'),
  json_extract(payload, '$.picture'),
  json_extract(payload, '$.selectedAlbumCoverFallback')
FROM tidal_artists
WHERE json_extract(payload, '$.name') IS NOT NULL;

DROP TABLE IF EXISTS tidal_artists;
ALTER TABLE tidal_artists_new RENAME TO tidal_artists;

PRAGMA FOREIGN_KEYS = ON;
