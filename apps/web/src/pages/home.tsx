import { Spacer } from "@awlt/design";
import { useNavigate } from "react-router";

import MixedTrackList from "@/components/mixed-track-list";
import TrackGrid from "@/components/tracks/track-grid";
import useUserRecommendedTracks from "@/hooks/useUserRecommendedTracks";
import useUserTopTracks from "@/hooks/useUserTopTracks";

const HomePage = () => {
  const { data: topTracks, isLoading: isTopTracksLoading } = useUserTopTracks();
  const { data: recommendedTracks, isLoading: isRecommendedTracksLoading } = useUserRecommendedTracks();
  const navigate = useNavigate();

  const hasNoRecommendations = (!recommendedTracks || recommendedTracks.length === 0) && !isRecommendedTracksLoading;

  return (
    <>
      {!isTopTracksLoading && topTracks !== undefined && topTracks.length > 0 && (
        <>
          <Spacer size="8" />
          <h2 className="text-xl font-semibold text-(--gray-12)">Your top played tracks</h2>
          <Spacer size="2" />
          <div className="col-[breakout]!">
            <TrackGrid tracks={topTracks} />
          </div>
        </>
      )}

      {!isRecommendedTracksLoading && recommendedTracks !== undefined && recommendedTracks.length > 0 && (
        <>
          <Spacer size="8" />
          <h2 className="text-xl font-semibold text-(--gray-12)">Recommended new tracks for you</h2>
          <Spacer size="2" />
          <MixedTrackList tracks={recommendedTracks} limit={5} onSeeAllClick={() => navigate("/recommended-tracks")} />
        </>
      )}

      <Spacer size="8" />

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
