import { Loader, Spacer } from "@awlt/design";
import { useQuery } from "@tanstack/react-query";

import type { Artist } from "../../types";

import ArtistBlock from "../../components/music-blocks/artist-block";
import MusicBlockGrid from "../../components/music-blocks/music-block-grid";
import { request } from "../../utils/http";

const LibraryArtistsPage = () => {
  const query = useQuery({
    queryKey: ["favorite-artists"],
    queryFn: async () => {
      const resp = await request("/favorites/artists");
      const json: Artist[] = await resp.json();
      return json;
    },
  });

  const artists = query.data || [];

  return (
    <>
      <h1 className="text-3xl font-bold">Favorite Artists</h1>
      <Spacer size="4" />

      {query.isLoading && <Loader />}

      {!query.isLoading && artists.length > 0 && (
        <MusicBlockGrid>
          {artists.map((artist) => (
            <ArtistBlock key={artist.id} artist={artist} />
          ))}
        </MusicBlockGrid>
      )}

      {!query.isLoading && artists.length === 0 && (
        <p className="text-sm text-(--gray-11)">You haven't favorited any artists.</p>
      )}

      <Spacer size="12" />
    </>
  );
};

export default LibraryArtistsPage;
