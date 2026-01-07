import { useLoaderData, type LoaderFunction } from "react-router";
import { Link } from "react-router";
import type { ArtistPage } from "../types";
import { Button, IconButton, Spacer, Tabs } from "design";
import { Heart, Play, Share } from "lucide-react";
import AlbumsScroller from "../components/scrollers/albums";
import LatestRelease from "../components/albums/latest-release";
import TrackGrid from "../components/tracks/track-grid";
import ArtistTopTracksGrid from "../components/artist/top-tracks-grid";

const parseTidalRichTextIntoComponent = (text: string) => {
  const regex = /\[wimpLink (artistId|albumId)="(\d+)"\](.*?)\[\/wimpLink\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [_, idType, id, linkText] = match;
    const matchStart = match.index;

    // Add text before the link
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    // Determine the path based on idType
    const path = idType === "artistId" ? `/artists/${id}` : `/albums/${id}`;

    // Add the Link component
    parts.push(
      <Link
        className="text-(--blue-11)"
        key={`link-${idType}-${id}-${matchStart}`}
        to={path}
      >
        {linkText}
      </Link>,
    );

    lastIndex = regex.lastIndex;
  }

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span>{parts}</span>;
};

const loader: LoaderFunction = async ({ params }) => {
  const data = await fetch(`http://localhost:3003/v1/artists/${params.id}`);
  const json = await data.json();

  return json;
};

const ArtistPage = () => {
  const data = useLoaderData() as { artist: ArtistPage };

  console.log({ data });

  return (
    <>
      <div
        className="w-full h-[140px] bg-cover bg-center rounded-xl overflow-hidden"
        style={{
          backgroundImage: `url(https://resources.tidal.com/images/${data.artist.albums?.[1].cover.replace(/-/g, "/")}/1280x1280.jpg)`,
        }}
      >
        <div
          className="w-full h-full backdrop-blur-2xl"
          style={{
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        ></div>
      </div>
      <div className="flex gap-4 items-end">
        <div
          className="w-[180px] aspect-square rounded-[45px] border-4 border-(--gray-0) bg-cover ml-6 -mt-[40px] z-0"
          style={{
            backgroundImage: data.artist.picture
              ? `url(https://resources.tidal.com/images/${data.artist.picture?.replace(/-/g, "/")}/320x320.jpg)`
              : `url(https://resources.tidal.com/images/${data.artist.selectedAlbumCoverFallback?.replace(/-/g, "/")}/1280x1280.jpg)`,
          }}
        />
        <div className="flex flex-col items-start overflow-hidden flex-1 pb-3">
          <h1 className="text-4xl font-bold text-(--gray-12)">
            {data.artist.name}
          </h1>
          {data.artist.biography && (
            <p className="text-(--gray-11) text-xs line-clamp-2">
              {parseTidalRichTextIntoComponent(
                data.artist.biography?.slice(
                  0,
                  data.artist.biography.indexOf("<br/>") ||
                  data.artist.biography?.length,
                ),
              )}
            </p>
          )}
          <Spacer size="2" />
          <div className="flex gap-3 items-center">
            <Button variant="solid" color="blue" size="sm">
              <Play size={16} fill="currentColor" />
              Play Mix
            </Button>
            <IconButton color="gray" variant="soft" icon={Heart} size="sm" />
            <IconButton color="gray" variant="soft" icon={Share} size="sm" />
          </div>
        </div>
      </div>

      <Spacer size="4" />

      <Tabs.Root
        defaultValue="overview"
        className="grid grid-cols-subgrid col-[breakout]! *:col-[content]"
      >
        <Tabs.List className="bg-(--gray-1)!">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.TabSeparator />
          <Tabs.Tab value="albums">Albums</Tabs.Tab>
          <Tabs.TabSeparator />
          <Tabs.Tab value="singles">Singles & EPs</Tabs.Tab>
          <Tabs.TabSeparator />
          <Tabs.Tab value="compilations">Compilations</Tabs.Tab>
          <Tabs.TabSeparator />
          <Tabs.Tab value="topSongs">Top Songs</Tabs.Tab>
          <Tabs.TabSeparator />
          <Tabs.Tab value="appearsOn">Appears on</Tabs.Tab>
        </Tabs.List>

        <Spacer size="6" />

        <Tabs.Panel
          value="overview"
          className="grid grid-cols-subgrid col-[breakout]! *:col-[content]"
        >
          <div className="flex gap-10 col-[breakout]! pl-6">
            {data.artist.albums && data.artist.albums.length > 0 && (
              <div className="flex-1">
                <LatestRelease album={data.artist.albums[0]} />
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
              title="Latest Albums"
              albums={data.artist.albums.slice(1, data.artist.albums.length)}
              viewAllUrl={`/artists/${data.artist.id}/albums`}
            />
          )}

          <Spacer size="8" />

          {data.artist.topSingles && (
            <AlbumsScroller
              title="Top Singles"
              albums={data.artist.topSingles}
              viewAllUrl={`/artists/${data.artist.id}/singles`}
            />
          )}

          <Spacer size="8" />

          {data.artist.appearsOn && (
            <AlbumsScroller
              title="Appears on"
              albums={data.artist.appearsOn}
              viewAllUrl={`/artists/${data.artist.id}/appears`}
            />
          )}

          <Spacer size="8" />

          {data.artist.compilations && (
            <AlbumsScroller
              title="Compilations"
              albums={data.artist.compilations}
              viewAllUrl={`/artists/${data.artist.id}/compilations`}
            />
          )}
        </Tabs.Panel>
      </Tabs.Root>
    </>
  );
};

export { loader };
export default ArtistPage;
