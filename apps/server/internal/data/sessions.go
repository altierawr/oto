package data

import (
	"github.com/altierawr/oto/internal/types"
	"github.com/google/uuid"
)

type Session struct {
	ID        uuid.UUID         `json:"id"`
	CreatedAt UnixTime          `json:"createdAt"`
	UpdatedAt UnixTime          `json:"updatedAt"`
	Expiry    UnixTime          `json:"expiry"`
	Tracks    []types.TidalSong `json:"tracks"`
}
