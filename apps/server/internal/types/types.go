package types

type TidalAlbum struct {
	ID int `json:"id"`
	Title string `json:"title"`
	Cover string `json:"cover"`
	VideoCover string `json:"videoCover"`
	Songs []TidalSong `json:"songs"`
	Artists []TidalArtist `json:"artists"`
}

type TidalArtist struct {
	ID int `json:"id"`
	Name string `json:"name"`
	Picture string `json:"picture"`
}

type TidalSong struct {
	ID int `json:"id"`
	Title string `json:"title"`
	Duration int `json:"duration"`
	Explicit bool `json:"explicit"`
	TrackNumber int `json:"trackNumber"`
	Year string `json:"year"`
	ArtistId int `json:"artistId"`
	ArtistName string `json:"artistName"`
	ArtistPicture string `json:"artistPicture"`
	AlbumId int `json:"albumId"`
	AlbumTitle string `json:"albumTitle"`
	AlbumCover string `json:"albumCover"`
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

