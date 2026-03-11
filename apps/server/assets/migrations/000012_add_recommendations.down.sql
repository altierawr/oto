DROP TABLE IF EXISTS user_recommended_artists;

DROP INDEX IF EXISTS idx_user_recommended_artists_user_id;
DROP INDEX IF EXISTS idx_user_recommended_artists_artist_id;

DROP TABLE IF EXISTS user_recommended_albums;

DROP INDEX IF EXISTS idx_user_recommended_albums_user_id;
DROP INDEX IF EXISTS idx_user_recommended_albums_album_id;
DROP INDEX IF EXISTS idx_user_recommended_albums_album_recommended_from_id;

DROP TABLE IF EXISTS user_recommended_tracks;

DROP INDEX IF EXISTS idx_user_recommended_tracks_user_id;
DROP INDEX IF EXISTS idx_user_recommended_track_track_id;

DROP INDEX IF EXISTS idx_plays_user_id;
DROP INDEX IF EXISTS idx_plays_track_id;
