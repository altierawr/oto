package recommendations

import (
	"context"
	"fmt"
	"slices"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/tidal"
	"github.com/altierawr/oto/internal/types"
	"github.com/hbollon/go-edlib"
)

func (s *Service) updateSingleUserRecommendedTracks(ctx context.Context, user data.User, topTracksByArtist [][]types.TidalSong) error {
	tracksToRecommend := []types.TidalSong{}
	tracksToRecommendIds := []int{}

	// first prioritize recommending tracks from different artists, and if we don't get enough,
	// try more tracks from the same artists
	for iteration := range 5 {
		for _, artistTracks := range topTracksByArtist {
			if len(tracksToRecommend) >= 15 {
				break
			}

			if len(artistTracks)-1 < iteration {
				continue
			}

			track := artistTracks[iteration]

			s.logger.Info("checking recommendations for artist",
				"artist", track.Artists[0].Name,
				"track", track.Title)

			err := s.SyncIfMissing(ctx, int64(track.ID))
			if err != nil {
				s.logger.Error("couldn't fetch missing recommendations for autoplay",
					"error", err.Error(),
					"trackId", track)
				continue
			}

			recommendations, err := s.db.GetLastfmRecommendationsForTidalTrack(int64(track.ID))
			if err != nil {
				s.logger.Error("couldn't get lastfm reocmmednations for tidal track from db",
					"error", err.Error(),
					"trackId", track.ID)
				continue
			}

			nrAddedRecommendations := 0
			for _, recommendation := range recommendations {
				if nrAddedRecommendations >= 3 {
					break
				}

				artistName := recommendation.LastfmTrack.ArtistName
				title := recommendation.LastfmTrack.Title

				// check if the user already has played this track
				played, err := s.db.HasUserPlayedTrackByArtistAndTitle(user.ID, artistName, title)
				if err != nil {
					return err
				}

				if played {
					continue
				}

				results, err := tidal.Search(fmt.Sprintf("%s - %s", artistName, title))
				if err != nil {
					return err
				}

				if results == nil {
					s.logger.Error("tidal search results are nil",
						"artist", artistName,
						"title", title)
					continue
				}

				bestResult, err := s.getBestTidalSongMatchFromLastfmRecommendations(user, results.Songs, artistName, title)
				if err != nil {
					s.logger.Error("error finding best tidal song match for lastfm recommendation",
						"error", err.Error(),
						"artistName", artistName,
						"title", title)
					continue
				}

				if bestResult == nil {
					continue
				}

				// don't add duplicates
				if slices.Contains(tracksToRecommendIds, bestResult.ID) {
					continue
				}

				s.logger.Info("adding new recommended track",
					"userId", user.ID,
					"username", user.Username,
					"artist", artistName,
					"title", title)
				tracksToRecommend = append(tracksToRecommend, *bestResult)
				tracksToRecommendIds = append(tracksToRecommendIds, bestResult.ID)
				nrAddedRecommendations++
			}
		}
	}

	if len(tracksToRecommend) == 0 {
		s.logger.Warn("couldn't find any tracks to recommend for user",
			"userId", user.ID,
			"username", user.Username)
		return nil
	}

	err := s.db.SetUserRecommendedTracks(user.ID, tracksToRecommend)
	if err != nil {
		return err
	} else {
		s.logger.Info("set new user recommended tracks",
			"userId", user.ID,
			"username", user.Username,
			"nrTracks", len(tracksToRecommend))
	}

	return nil
}

func (s *Service) getBestTidalSongMatchFromLastfmRecommendations(user data.User, tracks []types.TidalSong, lastfmArtistName, lastfmTitle string) (*types.TidalSong, error) {
	var bestResult *types.TidalSong = nil
	var bestScore float32 = 0.0
	for idx, result := range tracks {
		if idx >= 5 {
			break
		}

		played, err := s.db.HasUserPlayedTrackByID(user.ID, result.ID)
		if err != nil {
			return nil, err
		}

		if played {
			continue
		}

		artistScore, err := edlib.StringsSimilarity(lastfmArtistName, result.Artists[0].Name, edlib.JaroWinkler)
		if err != nil {
			s.logger.Error("error comparing artist names",
				"error", err.Error(),
				"artistName1", lastfmArtistName,
				"artistName2", result.Artists[0].Name)
			continue
		}

		titleScore, err := edlib.StringsSimilarity(lastfmTitle, result.Title, edlib.JaroWinkler)
		if err != nil {
			s.logger.Error("error comparing song titles",
				"error", err.Error(),
				"title1", lastfmTitle,
				"title2", result.Title)
			continue
		}

		score := artistScore * titleScore
		if score > 0.85 && score > bestScore {
			bestScore = score
			bestResult = &result
		}
	}

	return bestResult, nil
}
