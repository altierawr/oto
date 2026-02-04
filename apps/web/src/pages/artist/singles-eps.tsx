import { useRouteLoaderData } from "react-router";
import type { ArtistPage, Album, PaginatedResponse } from "../../types";
import { getTidalCoverUrl } from "../../utils/image";
import { useQuery } from "@tanstack/react-query";
import MusicBlockGrid from "../../components/music-blocks/music-block-grid";
import MusicBlock from "../../components/music-blocks/music-block";
import { Loader } from "@awlt/design";
import { request } from "../../utils/http";

const ArtistPageSinglesAndEps = () => {
  const data = useRouteLoaderData("artist") as { artist: ArtistPage };
  const query = useQuery({
    queryKey: ["artist-singles-eps", data.artist.id],
    queryFn: async () => {
      const resp = await request(`/artists/${data.artist.id}/singles-eps`);
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
            <MusicBlock
              key={album.id}
              title={album.title}
              linkUrl={`/albums/${album.id}`}
              imageUrl={album.cover ? getTidalCoverUrl(album.cover, 320) : ""}
              date={album.releaseDate}
            />
          ))}
        </MusicBlockGrid>
      )}
    </>
  );
};

export default ArtistPageSinglesAndEps;
