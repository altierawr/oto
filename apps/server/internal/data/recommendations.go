package data

import "github.com/altierawr/oto/internal/types"

type UserRecommendedAlbum struct {
	Album                types.TidalAlbum `json:"album"`
	RecommendedFromAlbum types.TidalAlbum `json:"recommendedFromAlbum"`
}
