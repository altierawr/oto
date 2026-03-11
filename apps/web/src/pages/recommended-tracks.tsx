import { Loader, Spacer } from "@awlt/design";

import MixedTrackList from "@/components/mixed-track-list";
import useUserRecommendedTracks from "@/hooks/useUserRecommendedTracks";

const RecommendedTracksPage = () => {
  const { data, isLoading } = useUserRecommendedTracks();

  const tracks = data || [];

  return (
    <>
      <h1 className="text-2xl font-bold">Recommended new tracks for you</h1>
      <Spacer size="4" />

      {isLoading && <Loader />}

      {!isLoading && tracks.length > 0 && <MixedTrackList tracks={tracks} />}

      {!isLoading && tracks.length === 0 && (
        <p className="text-sm text-(--gray-11)">
          No recommended tracks for you. Listen to more tracks to get recommendations.
        </p>
      )}

      <Spacer size="12" />
    </>
  );
};

export default RecommendedTracksPage;
