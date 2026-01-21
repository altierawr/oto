import { useRouteLoaderData } from "react-router";
import ArtistTopTracksGrid from "../../components/artist/top-tracks-grid";
import AlbumsScroller from "../../components/scrollers/albums";
import type { ArtistPage } from "../../types";
import LatestRelease from "../../components/albums/latest-release";
import { Spacer } from "design";

const ArtistPageOverview = () => {
  const data = useRouteLoaderData("artist") as { artist: ArtistPage };

  const releasesByDate = [
    ...(data.artist.albums || []),
    ...(data.artist.topSingles || []),
  ].sort((a, b) => {
    const ad = new Date(a.releaseDate || 0);
    const bd = new Date(b.releaseDate || 0);

    if (ad > bd) return -1;
    if (bd > ad) return 1;
    return 0;
  });

  return (
    <>
      <div className="flex gap-10 col-[breakout]! pl-6">
        {releasesByDate.length > 0 && (
          <div className="flex-1">
            <LatestRelease album={releasesByDate[0]} />
          </div>
        )}
        {data.artist.topTracks && (
          <ArtistTopTracksGrid
            artist={data.artist}
            initialTopTracks={data.artist.topTracks}
          />
        )}
      </div>

      <Spacer size="8" />

      {data.artist.albums && (
        <AlbumsScroller
          id="latestAlbums"
          title="Latest Albums"
          albums={data.artist.albums}
          viewAllUrl={`/artists/${data.artist.id}/albums`}
          showArtists={false}
          showDate={true}
        />
      )}

      <Spacer size="8" />

      {data.artist.topSingles && (
        <AlbumsScroller
          id="topSingles"
          title="Top Singles"
          albums={data.artist.topSingles}
          viewAllUrl={`/artists/${data.artist.id}/singles-eps`}
          showArtists={false}
          showDate={true}
        />
      )}

      <Spacer size="8" />

      {data.artist.appearsOn && (
        <AlbumsScroller
          id="appearsOn"
          title="Appears on"
          albums={data.artist.appearsOn}
          viewAllUrl={`/artists/${data.artist.id}/appears-on`}
          showArtists={false}
          showDate={true}
        />
      )}

      <Spacer size="8" />

      {data.artist.compilations && (
        <AlbumsScroller
          id="compilations"
          title="Compilations"
          albums={data.artist.compilations}
          viewAllUrl={`/artists/${data.artist.id}/compilations`}
          showArtists={false}
          showDate={true}
        />
      )}
    </>
  );
};

export default ArtistPageOverview;
