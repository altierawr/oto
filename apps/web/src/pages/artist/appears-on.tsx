import { Loader } from "@awlt/design";
import { useQuery } from "@tanstack/react-query";
import { useRouteLoaderData } from "react-router";

import type { ArtistPage, Album, PaginatedResponse } from "../../types";

import AlbumBlock from "../../components/music-blocks/album-block";
import MusicBlockGrid from "../../components/music-blocks/music-block-grid";
import { request } from "../../utils/http";

const ArtistPageAppearsOn = () => {
  const data = useRouteLoaderData("artist") as { artist: ArtistPage };
  const query = useQuery({
    queryKey: ["artist-appears-on", data.artist.id],
    queryFn: async () => {
      const resp = await request(`/artists/${data.artist.id}/appears-on`);
      const json: PaginatedResponse<Album> = await resp.json();

      return json;
    },
  });

  return (
    <>
      {query.isLoading && <Loader />}
      {!query.isLoading && (
        <MusicBlockGrid>
          {query.data?.items.map((album: Album) => (
            <AlbumBlock key={album.id} album={album} showDate />
          ))}
        </MusicBlockGrid>
      )}
    </>
  );
};

export default ArtistPageAppearsOn;
