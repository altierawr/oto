package types

type TidalAlbum struct {
	ID              int           `json:"id"`
	Cover           string        `json:"cover,omitempty"`
	Explicit        bool          `json:"explicit,omitempty"`
	Duration        int           `json:"duration"`
	NumberOfTracks  int           `json:"numberOfTracks"`
	NumberOfVolumes int           `json:"numberOfVolumes"`
	ReleaseDate     string        `json:"releaseDate,omitempty"`
	Title           string        `json:"title"`
	Type            string        `json:"type"` // SINGLE, EP, ALBUM
	UPC             string        `json:"upc,omitempty"`
	VibrantColor    string        `json:"vibrantColor,omitempty"`
	VideoCover      string        `json:"videoCover,omitempty"`
	Songs           []TidalSong   `json:"songs,omitempty"`
	Artists         []TidalArtist `json:"artists"`
}

type TidalArtist struct {
	ID      int    `json:"id"`
	Name    string `json:"name"`
	Picture string `json:"picture,omitempty"`
}

type TidalSong struct {
	ID              int           `json:"id"`
	Bpm             int           `json:"bpm,omitempty"`
	Duration        int           `json:"duration"`
	Explicit        bool          `json:"explicit"`
	ISRC            string        `json:"isrc,omitempty"`
	StreamStartDate string        `json:"StreamStartDate,omitempty"`
	Title           string        `json:"title"`
	TrackNumber     int           `json:"trackNumber,omitempty"`
	VolumeNumber    int           `json:"volumeNumber,omitempty"`
	Artists         []TidalArtist `json:"artists"`
	Album           TidalAlbum    `json:"album"`
}

type TidalPlaylist struct {
	UUID                string        `json:"uuid"`
	Created             string        `json:"created"`
	Description         string        `json:"description"`
	Popularity          float64       `json:"popularity"`
	Duration            int           `json:"duration"`
	LastItemAddedAt     string        `json:"lastItemAddedAt"`
	LastUpdated         string        `json:"lastUpdated"`
	NumberOfAudioTracks int           `json:"numberOfAudioTracks"`
	NumberOfTracks      int           `json:"numberOfTracks"`
	PromotedArtists     []TidalArtist `json:"promotedArtists"`
	PublicPlaylist      bool          `json:"publicPlaylist"`
	Title               string        `json:"title"`
	SquareImage         string        `json:"squareImage,omitempty"`
	Type                string        `json:"type"`
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
