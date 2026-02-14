import { Button, Spacer } from "@awlt/design";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";

import type { Album, Artist, Song } from "../../types";

import AlbumsScroller from "../../components/scrollers/albums";
import ArtistsScroller from "../../components/scrollers/artists";
import TrackGrid from "../../components/tracks/track-grid";
import { request } from "../../utils/http";

const LibraryPage = () => {
  const navigate = useNavigate();

  const artistsQuery = useQuery({
    queryKey: ["favorite-artists"],
    queryFn: async () => {
      const resp = await request("/favorites/artists");
      const json: Artist[] = await resp.json();
      return json;
    },
  });

  const albumsQuery = useQuery({
    queryKey: ["favorite-albums"],
    queryFn: async () => {
      const resp = await request("/favorites/albums");
      const json: Album[] = await resp.json();
      return json;
    },
  });

  const tracksQuery = useQuery({
    queryKey: ["favorite-tracks"],
    queryFn: async () => {
      const resp = await request("/favorites/tracks");
      const json: Song[] = await resp.json();
      return json;
    },
  });

  const tracks = tracksQuery.data || [];
  const albums = albumsQuery.data || [];
  const artists = artistsQuery.data || [];

  return (
    <>
      <div className="col-[breakout]! flex flex-col">
        <div className="w-full">
          <div className="flex items-center justify-between px-(--content-side-padding)">
            <h2 className="text-2xl font-semibold">Tracks</h2>
            <div>
              {tracks.length > 0 && (
                <Button variant="soft" color="gray" size="xs" onClick={() => navigate("/library/tracks")}>
                  View All
                </Button>
              )}
            </div>
          </div>
          <Spacer size="2" />
          <div className="relative">
            <TrackGrid tracks={tracks} isLoading={tracksQuery.isLoading} />
            {!tracksQuery.isLoading && tracks.length === 0 && (
              <p className="absolute top-0 left-(--content-side-padding) text-sm text-(--gray-11)">
                You haven't favorited any tracks.
              </p>
            )}
          </div>
        </div>
      </div>

      <Spacer size="8" />

      <div className="relative">
        {!albumsQuery.isLoading && albums.length === 0 && (
          <div className="absolute top-0 left-0">
            <h2 className="invisible text-2xl">Albums</h2>
            <Spacer size="2" />
            <p className="text-sm text-(--gray-11)">You haven't favorited any albums.</p>
          </div>
        )}
      </div>

      <AlbumsScroller
        id="albums"
        title="Albums"
        viewAllUrl="/library/albums"
        albums={albums}
        showArtists={false}
        showDate={true}
        isLoading={albumsQuery.isLoading}
      />

      <Spacer size="8" />

      <div className="relative">
        {!artistsQuery.isLoading && artists.length === 0 && (
          <div className="absolute top-0 left-0">
            <h2 className="invisible text-2xl">Artists</h2>
            <Spacer size="2" />
            <p className="text-sm text-(--gray-11)">You haven't favorited any artists.</p>
          </div>
        )}
      </div>

      <ArtistsScroller
        id="artists"
        title="Artists"
        viewAllUrl="/library/artists"
        artists={artists}
        isLoading={artistsQuery.isLoading}
      />

      <Spacer size="12" />
    </>
  );
};

export default LibraryPage;
