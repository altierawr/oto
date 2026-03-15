package types

type TidalAlbum struct {
	ID              int           `db:"id" json:"id"`
	Cover           *string       `db:"cover" json:"cover,omitempty"`
	Explicit        bool          `db:"explicit" json:"explicit,omitempty"`
	Duration        *int          `db:"duration" json:"duration,omitempty"`
	NumberOfTracks  *int          `db:"number_of_tracks" json:"numberOfTracks,omitempty"`
	NumberOfVolumes *int          `db:"number_of_volumes" json:"numberOfVolumes,omitempty"`
	ReleaseDate     *string       `db:"release_date" json:"releaseDate,omitempty"`
	Title           string        `db:"title" json:"title"`
	Type            *string       `db:"type" json:"type,omitempty"` // SINGLE, EP, ALBUM
	UPC             *string       `db:"upc" json:"upc,omitempty"`
	VibrantColor    *string       `db:"vibrant_color" json:"vibrantColor,omitempty"`
	VideoCover      *string       `db:"video_cover" json:"videoCover,omitempty"`
	Songs           []TidalSong   `json:"songs,omitempty"`
	Artists         []TidalArtist `json:"artists,omitempty"`
	UpdatedAt       *int64        `db:"updated_at"`
	ArtistId        *int          `db:"artist_id"`
}

type TidalArtist struct {
	ID                         int     `db:"id" json:"id"`
	Name                       string  `db:"name" json:"name"`
	Picture                    *string `db:"picture" json:"picture,omitempty"`
	SelectedAlbumCoverFallback *string `db:"selected_album_cover_fallback" json:"SelectedAlbumCoverFallback,omitempty"`
	UpdatedAt                  *int64  `db:"updated_at"`
}

type TidalSong struct {
	ID              int           `db:"id" json:"id"`
	Bpm             *int          `db:"bpm" json:"bpm,omitempty"`
	Duration        int           `db:"duration" json:"duration"`
	Explicit        bool          `db:"explicit" json:"explicit"`
	ISRC            *string       `db:"isrc" json:"isrc,omitempty"`
	StreamStartDate *string       `db:"stream_start_date" json:"streamStartDate,omitempty"`
	Title           string        `db:"title" json:"title"`
	TrackNumber     *int          `db:"track_number" json:"trackNumber,omitempty"`
	VolumeNumber    *int          `db:"volume_number" json:"volumeNumber,omitempty"`
	Artists         []TidalArtist `json:"artists"`
	Album           *TidalAlbum   `json:"album"`
	UpdatedAt       *int64        `db:"updated_at"`
	ArtistId        *int          `db:"artist_id"`
	AlbumId         *int          `db:"album_id"`
}

type TidalPlaylist struct {
	UUID                string        `json:"uuid"`
	Created             *string       `json:"created,omitempty"`
	Description         *string       `json:"description,omitempty"`
	Popularity          *float64      `json:"popularity,omitempty"`
	Duration            *int          `json:"duration,omitempty"`
	LastItemAddedAt     *string       `json:"lastItemAddedAt,omitempty"`
	LastUpdated         *string       `json:"lastUpdated,omitempty"`
	NumberOfAudioTracks *int          `json:"numberOfAudioTracks,omitempty"`
	NumberOfTracks      *int          `json:"numberOfTracks,omitempty"`
	PromotedArtists     []TidalArtist `json:"promotedArtists"`
	PublicPlaylist      *bool         `json:"publicPlaylist,omitempty"`
	Title               string        `json:"title"`
	SquareImage         *string       `json:"squareImage,omitempty"`
	Type                *string       `json:"type,omitempty"`
}

type TidalTopHit struct {
	Type  string `json:"type"` // ARTISTS,ALBUMS,TRACKS,PLAYLISTS
	Value any    `json:"value"`
}

type PlaybackInfo struct {
	Manifest string `json:"manifest,omitempty"`
}

type ManifestData struct {
	Urls []string `json:"urls,omitempty"`
}

type TidalPlaybackInfo struct {
	ManifestMimeType string `json:"manifestMimeType"`
	Manifest         string `json:"manifest"`
}

type TidalSearch struct {
	Artists   []TidalArtist   `json:"artists"`
	Albums    []TidalAlbum    `json:"albums"`
	Songs     []TidalSong     `json:"songs"`
	Playlists []TidalPlaylist `json:"playlists"`
	TopHits   []TidalTopHit   `json:"topHits"`
}

type TidalArtistPage struct {
	ID                         int           `json:"id"`
	Name                       string        `json:"name"`
	Picture                    *string       `json:"picture,omitempty"`
	SelectedAlbumCoverFallback *string       `json:"selectedAlbumCoverFallback,omitempty"`
	Biography                  *string       `json:"biography,omitempty"`
	TopTracks                  []TidalSong   `json:"topTracks,omitempty"`
	Albums                     []TidalAlbum  `json:"albums,omitempty"`
	Compilations               []TidalAlbum  `json:"compilations,omitempty"`
	TopSingles                 []TidalAlbum  `json:"topSingles,omitempty"`
	AppearsOn                  []TidalAlbum  `json:"appearsOn,omitempty"`
	SimilarArtists             []TidalArtist `json:"similarArtists,omitempty"`
}
