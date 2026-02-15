import { Loader, Spacer } from "@awlt/design";
import { useQuery } from "@tanstack/react-query";

import type { Album } from "../../types";

import AlbumBlock from "../../components/music-blocks/album-block";
import MusicBlockGrid from "../../components/music-blocks/music-block-grid";
import { request } from "../../utils/http";

const LibraryAlbumsPage = () => {
  const query = useQuery({
    queryKey: ["favorite-albums"],
    queryFn: async () => {
      const resp = await request("/favorites/albums");
      const json: Album[] = await resp.json();
      return json;
    },
  });

  const albums = query.data || [];

  return (
    <>
      <h1 className="text-3xl font-bold">Favorite Albums</h1>
      <Spacer size="4" />

      {query.isLoading && <Loader />}

      {!query.isLoading && albums.length > 0 && (
        <MusicBlockGrid>
          {albums.map((album) => (
            <AlbumBlock key={album.id} album={album} showDate />
          ))}
        </MusicBlockGrid>
      )}

      {!query.isLoading && albums.length === 0 && (
        <p className="text-sm text-(--gray-11)">You haven't favorited any albums.</p>
      )}

      <Spacer size="12" />
    </>
  );
};

export default LibraryAlbumsPage;
