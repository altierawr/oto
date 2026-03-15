package recommendations

import (
	"context"
	"sync"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/types"
)

func (s *Service) updateUserRecommendations() {
	s.logger.Info("updating user recommendations")

	users, err := s.db.GetUsers()
	if err != nil {
		s.logger.Error("error getting users",
			"error", err.Error())
		return
	}

	ctx := context.Background()

	var wg sync.WaitGroup
	for _, user := range users {
		wg.Go(func() {
			err = s.updateSingleUserRecommendations(ctx, user)

			if err != nil {
				s.logger.Error("error updating user recommendations",
					"userId", user.ID,
					"username", user.Username,
					"error", err.Error())
			}
		})
	}

	wg.Wait()
}

func (s *Service) updateSingleUserRecommendations(ctx context.Context, user data.User) error {
	topTracks, err := s.db.GetUserTopPlayedTracks(user.ID, 1.0)
	if err != nil {
		return err
	}

	artistIndices := make(map[int]int)
	topTracksByArtist := [][]types.TidalSong{}
	currentArtistIndex := 0
	for _, track := range topTracks {
		if len(track.Artists) == 0 {
			continue
		}

		artist := track.Artists[0]
		if _, exists := artistIndices[artist.ID]; !exists {
			artistIndices[artist.ID] = currentArtistIndex
			topTracksByArtist = append(topTracksByArtist, []types.TidalSong{})
			currentArtistIndex++
		}

		artistIndex := artistIndices[artist.ID]
		topTracksByArtist[artistIndex] = append(topTracksByArtist[artistIndex], track)
	}

	err = s.updateSingleUserRecommendedTracks(ctx, user, topTracksByArtist)
	if err != nil {
		return err
	}

	err = s.updateSingleUserRecommendedAlbums(ctx, user, topTracks, topTracksByArtist)
	if err != nil {
		return err
	}

	return nil
}
