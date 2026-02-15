import { Loader, Spacer } from "@awlt/design";
import { useQuery } from "@tanstack/react-query";

import type { Song } from "../../types";

import MixedTrackList from "../../components/mixed-track-list";
import { request } from "../../utils/http";

const LibraryTracksPage = () => {
  const query = useQuery({
    queryKey: ["favorite-tracks"],
    queryFn: async () => {
      const resp = await request("/favorites/tracks");
      const json: Song[] = await resp.json();
      return json;
    },
  });

  const tracks = query.data || [];

  return (
    <>
      <h1 className="text-3xl font-bold">Favorite Tracks</h1>
      <Spacer size="4" />

      {query.isLoading && <Loader />}

      {!query.isLoading && tracks.length > 0 && <MixedTrackList tracks={tracks} />}

      {!query.isLoading && tracks.length === 0 && (
        <p className="text-sm text-(--gray-11)">You haven't favorited any tracks.</p>
      )}

      <Spacer size="12" />
    </>
  );
};

export default LibraryTracksPage;
