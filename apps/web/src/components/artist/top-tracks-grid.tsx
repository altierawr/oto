import { useQuery } from "@tanstack/react-query";
import type { Artist, Song } from "../../types";
import TrackGrid from "../tracks/track-grid";

type TProps = {
  artist: Artist;
  initialTopTracks: Song[];
};

const ArtistTopTracksGrid = ({ artist, initialTopTracks }: TProps) => {
  const query = useQuery({
    queryKey: ["artist-top-tracks", artist.id],
    queryFn: async () => {
      const resp = await fetch(
        `http://localhost:3003/v1/artists/${artist.id}/toptracks`,
      );
      const json = await resp.json();

      return json.tracks;
    },
  });

  return (
    <TrackGrid
      tracks={query.data?.items || initialTopTracks}
      isLoading={query.isLoading}
    />
  );
};

export default ArtistTopTracksGrid;
