import { useRouteLoaderData } from "react-router";
import type { ArtistPage } from "../../types";
import { useQuery } from "@tanstack/react-query";
import type { Album } from "../../types";
import MusicBlockGrid from "../../components/music-blocks/music-block-grid";
import MusicBlock from "../../components/music-blocks/music-block";
import { Loader } from "design";

const ArtistPageAlbums = () => {
  const data = useRouteLoaderData("artist") as { artist: ArtistPage };
  const query = useQuery({
    queryKey: ["artist-albums", data.artist.id],
    queryFn: async () => {
      const resp = await fetch(
        `http://localhost:3003/v1/artists/${data.artist.id}/albums`,
      );
      const json = await resp.json();

      return json.albums;
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
              imageUrl={`https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/320x320.jpg`}
              date={album.releaseDate}
            />
          ))}
        </MusicBlockGrid>
      )}
    </>
  );
};

export default ArtistPageAlbums;
