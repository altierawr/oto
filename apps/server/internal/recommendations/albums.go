package recommendations

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/altierawr/oto/internal/data"
	"github.com/altierawr/oto/internal/database"
	"github.com/altierawr/oto/internal/types"
	"github.com/hbollon/go-edlib"
)

const (
	MAX_RECOMMENDED_FROM_ALBUMS      = 3
	MAX_RECOMMENDED_ALBUMS_PER_ALBUM = 20
)

func (s *Service) updateSingleUserRecommendedAlbums(ctx context.Context, user data.User) error {
	s.logger.Info("updating user recommended albums")

	topAlbums, err := s.db.GetUserTopPlayedAlbums(user.ID, 1.0)
	if err != nil {
		return err
	}

	seedAlbums := []types.TidalAlbum{}
	seedAlbumsByID := map[int]types.TidalAlbum{}
	for _, basicAlbum := range topAlbums {
		if len(seedAlbums) >= MAX_RECOMMENDED_FROM_ALBUMS {
			break
		}

		seedAlbums = append(seedAlbums, basicAlbum)
		seedAlbumsByID[basicAlbum.ID] = basicAlbum
	}

	albumScores := map[int]map[string]float64{}
	albumSeedScores := map[string]map[int]float64{}
	albumMeta := map[string]lastfmAlbumMeta{}

	for _, basicAlbum := range seedAlbums {
		s.logger.Info("looking up recommendations for album",
			"title", basicAlbum.Title)
		album, err := s.db.GetTidalAlbum(basicAlbum.ID)
		if err != nil {
			return err
		}

		for _, track := range album.Songs {
			select {
			case <-s.stop:
				return nil
			default:
			}

			s.SyncIfMissing(ctx, int64(track.ID))
			recommended, err := s.db.GetLastfmRecommendationsForTidalTrack(int64(track.ID))
			if err != nil {
				s.logger.Error("couldn't get lastfm recommendations for tidal track",
					"error", err.Error(),
					"id", track.ID,
					"title", track.Title)
				continue
			}

			if len(recommended) == 0 {
				continue
			}

			for _, recommendation := range recommended {
				artistName := strings.TrimSpace(recommendation.LastfmTrack.ArtistName)
				if artistName == "" {
					continue
				}

				albumTitle := ""
				if recommendation.LastfmTrack.AlbumTitle != nil {
					albumTitle = strings.TrimSpace(*recommendation.LastfmTrack.AlbumTitle)
				}

				albumMBID := ""
				if recommendation.LastfmTrack.AlbumMbid != nil {
					albumMBID = strings.TrimSpace(*recommendation.LastfmTrack.AlbumMbid)
				}

				key := buildLastfmAlbumKey(artistName, albumTitle, albumMBID)
				if key == "" {
					continue
				}

				if _, ok := albumScores[basicAlbum.ID]; !ok {
					albumScores[basicAlbum.ID] = map[string]float64{}
				}
				albumScores[basicAlbum.ID][key] += recommendation.Match

				if _, ok := albumSeedScores[key]; !ok {
					albumSeedScores[key] = map[int]float64{}
				}
				albumSeedScores[key][basicAlbum.ID] += recommendation.Match

				meta, ok := albumMeta[key]
				if !ok {
					albumMeta[key] = lastfmAlbumMeta{
						ArtistName: artistName,
						AlbumTitle: albumTitle,
						AlbumMBID:  albumMBID,
					}
				} else {
					updated := false
					if meta.AlbumMBID == "" && albumMBID != "" {
						meta.AlbumMBID = albumMBID
						updated = true
					}
					if meta.AlbumTitle == "" && albumTitle != "" {
						meta.AlbumTitle = albumTitle
						updated = true
					}
					if meta.ArtistName == "" && artistName != "" {
						meta.ArtistName = artistName
						updated = true
					}
					if updated {
						albumMeta[key] = meta
					}
				}
			}
		}
	}

	if len(albumScores) == 0 {
		s.logger.Warn("couldn't find any album recommendations for user",
			"userId", user.ID,
			"username", user.Username)
		return nil
	}

	candidates := map[int][]lastfmAlbumScore{}
	for albumId := range albumScores {
		candidates[albumId] = []lastfmAlbumScore{}

		for key, score := range albumScores[albumId] {
			candidates[albumId] = append(candidates[albumId], lastfmAlbumScore{
				Key:   key,
				Score: score,
			})
		}

		sort.Slice(candidates[albumId], func(a int, b int) bool {
			if candidates[albumId][a].Score == candidates[albumId][b].Score {
				return candidates[albumId][a].Key < candidates[albumId][b].Key
			}

			return candidates[albumId][a].Score > candidates[albumId][b].Score
		})
	}

	recommendedAlbums := []data.UserRecommendedAlbum{}
	recommendedAlbumIDs := map[int]struct{}{}
	for seedAlbumId, albumCandidates := range candidates {
		nrAdded := 0
		for _, candidate := range albumCandidates {
			select {
			case <-s.stop:
				return nil
			default:
			}

			if nrAdded >= MAX_RECOMMENDED_ALBUMS_PER_ALBUM {
				break
			}

			meta, ok := albumMeta[candidate.Key]
			if !ok || meta.AlbumTitle == "" || meta.ArtistName == "" {
				continue
			}

			recommendedFromAlbum, ok := seedAlbumsByID[seedAlbumId]
			if !ok {
				continue
			}

			// use locally stored album if available
			album, err := s.db.GetTidalAlbumByArtistAndTitle(meta.ArtistName, meta.AlbumTitle)
			if err != nil {
				s.logger.Warn("couldn't search tidal for lastfm album recommendation",
					"error", err.Error(),
					"artist", meta.ArtistName,
					"album", meta.AlbumTitle)
			}

			if err == nil && album == nil {
				// if album wasn't found, try again if the album title ends with things commonly conflicting strings
				albumTitle, found := strings.CutSuffix(meta.AlbumTitle, " - EP")
				if !found {
					albumTitle, found = strings.CutSuffix(meta.AlbumTitle, " - Single")
				}

				if found {
					album, err = s.db.GetTidalAlbumByArtistAndTitle(meta.ArtistName, albumTitle)
					if err != nil {
						s.logger.Warn("couldn't search tidal for lastfm album recommendation",
							"error", err.Error(),
							"artist", meta.ArtistName,
							"album", albumTitle)
					}
				}
			}

			if err == nil && album != nil {
				if _, exists := recommendedAlbumIDs[album.ID]; exists {
					continue
				}

				recommendedAlbums = append(recommendedAlbums, data.UserRecommendedAlbum{
					Album:                *album,
					RecommendedFromAlbum: recommendedFromAlbum,
				})
				recommendedAlbumIDs[album.ID] = struct{}{}
				nrAdded++
				continue
			}

			s.logger.Info("tidal album wasn't found in database, need to fetch",
				"artist", meta.ArtistName,
				"album", meta.AlbumTitle)
			results, err := s.tidal.Search(fmt.Sprintf("%s - %s", meta.ArtistName, meta.AlbumTitle))
			if err != nil {
				if !errors.Is(err, database.ErrRecordNotFound) {
					s.logger.Warn("couldn't search tidal for lastfm album recommendation",
						"error", err.Error(),
						"artist", meta.ArtistName,
						"album", meta.AlbumTitle)
				}
				continue
			}

			bestAlbum := getBestTidalAlbumMatchFromLastfm(meta.ArtistName, meta.AlbumTitle, results.Albums)
			if bestAlbum == nil || len(bestAlbum.Artists) == 0 {
				continue
			}

			if _, exists := recommendedAlbumIDs[bestAlbum.ID]; exists {
				continue
			}

			recommendedAlbums = append(recommendedAlbums, data.UserRecommendedAlbum{
				Album:                *bestAlbum,
				RecommendedFromAlbum: recommendedFromAlbum,
			})
			recommendedAlbumIDs[bestAlbum.ID] = struct{}{}
			nrAdded++
		}

	}

	if len(recommendedAlbums) == 0 {
		s.logger.Warn("couldn't resolve any album recommendations for user",
			"userId", user.ID,
			"username", user.Username)
		return nil
	}

	err = s.db.SetUserRecommendedAlbums(user.ID, recommendedAlbums)
	if err != nil {
		return err
	}

	s.logger.Info("set new user recommended albums",
		"userId", user.ID,
		"username", user.Username,
		"nrAlbums", len(recommendedAlbums))

	return nil
}

type lastfmAlbumMeta struct {
	ArtistName string
	AlbumTitle string
	AlbumMBID  string
}

type lastfmAlbumScore struct {
	Key   string
	Score float64
}

func buildLastfmAlbumKey(artistName, albumTitle, albumMBID string) string {
	if albumMBID != "" {
		return "mbid:" + albumMBID
	}

	artist := normalizeLastfmAlbumKey(artistName)
	title := normalizeLastfmAlbumKey(albumTitle)
	if artist == "" || title == "" {
		return ""
	}

	return "name:" + artist + "|" + title
}

func normalizeLastfmAlbumKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func bestSeedAlbumId(seedScores map[int]float64) (int, bool) {
	if len(seedScores) == 0 {
		return 0, false
	}

	bestId := 0
	bestScore := -1.0
	for id, score := range seedScores {
		if score > bestScore || (score == bestScore && (bestId == 0 || id < bestId)) {
			bestId = id
			bestScore = score
		}
	}

	return bestId, true
}

func getBestTidalAlbumMatchFromLastfm(
	artistName string,
	albumTitle string,
	albums []types.TidalAlbum,
) *types.TidalAlbum {
	if artistName == "" || albumTitle == "" {
		return nil
	}

	var bestAlbum *types.TidalAlbum
	var bestScore float32 = 0.0
	for _, album := range albums {
		if len(album.Artists) == 0 {
			continue
		}

		artistScore, err := edlib.StringsSimilarity(artistName, album.Artists[0].Name, edlib.JaroWinkler)
		if err != nil {
			continue
		}

		titleScore, err := edlib.StringsSimilarity(albumTitle, album.Title, edlib.JaroWinkler)
		if err != nil {
			continue
		}

		score := artistScore * titleScore
		if score > 0.85 && score > bestScore {
			bestScore = score
			candidate := album
			bestAlbum = &candidate
		}
	}

	return bestAlbum
}
