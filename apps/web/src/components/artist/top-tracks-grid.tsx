import { useQuery } from "@tanstack/react-query";
import type { Artist, Song, PaginatedResponse } from "../../types";
import TrackGrid from "../tracks/track-grid";
import { request } from "../../utils/http";

type TProps = {
  artist: Artist;
  initialTopTracks: Song[];
  className?: string;
};

const ArtistTopTracksGrid = ({
  artist,
  initialTopTracks,
  className,
}: TProps) => {
  const query = useQuery({
    queryKey: ["artist-top-tracks", artist.id],
    queryFn: async () => {
      const resp = await request(
        `/artists/${artist.id}/toptracks`,
        { credentials: "include" },
      );
      const json: PaginatedResponse<Song> = await resp.json();

      return json;
    },
  });

  return (
    <TrackGrid
      tracks={query.data?.items || initialTopTracks}
      isLoading={query.isLoading}
      className={className}
    />
  );
};

export default ArtistTopTracksGrid;
