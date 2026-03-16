import { Spacer } from "@awlt/design";
import { useNavigate } from "react-router";
import { Fragment } from "react/jsx-runtime";

import MixedTrackList from "@/components/mixed-track-list";
import RecommendedAlbumScroller from "@/components/scrollers/albums/recommended";
import TrackGrid from "@/components/tracks/track-grid";
import useUserRecommendedAlbums from "@/hooks/useUserRecommendedAlbums";
import useUserRecommendedTracks from "@/hooks/useUserRecommendedTracks";
import useUserTopTracks from "@/hooks/useUserTopTracks";

const HomePage = () => {
  const { data: topTracks, isLoading: isTopTracksLoading } = useUserTopTracks();
  const { data: recommendedTracks, isLoading: isRecommendedTracksLoading } = useUserRecommendedTracks();
  const { data: recommendedAlbums, isLoading: isRecommendedAlbumsLoading } = useUserRecommendedAlbums();
  const navigate = useNavigate();

  const hasNoTrackRecommendations =
    (!recommendedTracks || recommendedTracks.length === 0) && !isRecommendedTracksLoading;
  const hasNoAlbumRecommendations =
    (!recommendedAlbums || recommendedAlbums.length === 0) && !isRecommendedAlbumsLoading;
  const hasNoRecommendations = hasNoAlbumRecommendations && hasNoTrackRecommendations;

  return (
    <>
      {!isTopTracksLoading && topTracks !== undefined && topTracks.length > 0 && (
        <>
          <Spacer size="10" />
          <h2 className="text-xl font-semibold text-(--gray-12)">Your top tracks</h2>
          <Spacer size="2" />
          <div className="col-[breakout]!">
            <TrackGrid tracks={topTracks} />
          </div>
        </>
      )}

      {!isRecommendedTracksLoading && recommendedTracks !== undefined && recommendedTracks.length > 0 && (
        <>
          <Spacer size="10" />
          <h2 className="text-xl font-semibold text-(--gray-12)">Recommended new tracks for you</h2>
          <Spacer size="2" />
          <MixedTrackList tracks={recommendedTracks} limit={5} onSeeAllClick={() => navigate("/recommended-tracks")} />
        </>
      )}

      {!isRecommendedAlbumsLoading && recommendedAlbums !== undefined && recommendedAlbums.length > 0 && (
        <>
          {recommendedAlbums.map((recommended) => (
            <Fragment key={recommended.recommendedFromAlbum.id}>
              <Spacer size="10" />
              <RecommendedAlbumScroller
                id={String(recommended.recommendedFromAlbum.id)}
                recommendedFromAlbum={recommended.recommendedFromAlbum}
                albums={recommended.albums}
              />
            </Fragment>
          ))}
        </>
      )}

      <Spacer size="10" />

      {hasNoRecommendations && (
        <p className="mt-2 max-w-[500px] text-(--gray-11)">
          You currently have no music recommendations. Listen to music to start getting recommendations! Initial
          recommendations might take a bit of time to appear.
        </p>
      )}
    </>
  );
};

export default HomePage;
