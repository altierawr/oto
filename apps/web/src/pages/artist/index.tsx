import type { TabsTab } from "@base-ui/react";

import { Button, Spacer, Tabs } from "@awlt/design";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play } from "lucide-react";
import { Fragment } from "react";
import { Helmet } from "react-helmet-async";
import { Outlet, useLoaderData, useLocation, useNavigate, useParams, type LoaderFunction } from "react-router";
import { Link } from "react-router";

import type { PaginatedResponse, Song, ArtistPage as TArtistPage } from "../../types";

import { usePlayerState } from "../../store";
import { request } from "../../utils/http";
import { getTidalCoverUrl } from "../../utils/image";
import ArtistPageOverview from "./overview";

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
      <Link className="text-(--blue-11)" key={`link-${idType}-${id}-${matchStart}`} to={path}>
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
  const data = await request(`/artists/${params.id}`);
  const json: TArtistPage = await data.json();

  return { artist: json };
};

const ArtistPage = () => {
  const { id } = useParams();
  const data = useLoaderData() as { artist: TArtistPage };
  const { player, playerState, song } = usePlayerState();
  const navigate = useNavigate();
  const location = useLocation();

  const topTracksQuery = useQuery({
    queryKey: ["artist-top-tracks", id],
    queryFn: async () => {
      const resp = await request(`/artists/${id}/toptracks`);
      const json: PaginatedResponse<Song> = await resp.json();

      return json;
    },
  });

  const isChildRoute = location.pathname !== `/artists/${id}`;

  const getActiveTab = () => {
    const path = location.pathname.endsWith("/")
      ? location.pathname.slice(0, location.pathname.length - 1)
      : location.pathname;

    if (path.endsWith(`${id}`)) {
      return "overview";
    } else {
      return path.slice(path.lastIndexOf("/") + 1);
    }
  };

  const handleTabChange = (value: TabsTab.Value) => {
    if (value === "overview") {
      navigate(`/artists/${id}`);
    } else {
      navigate(`/artists/${id}/${value}`);
    }
  };

  let isArtistPlaying = true;
  if (!topTracksQuery.data || !song) {
    isArtistPlaying = false;
  } else {
    for (let i = 0; i < player.playlist.length; i++) {
      const { song } = (player.originalPlaylist || player.playlist)[i];

      if (i >= topTracksQuery.data.items.length || song.id !== topTracksQuery.data.items[i].id) {
        isArtistPlaying = false;
        break;
      }
    }
  }

  const handlePlayClick = () => {
    if (isArtistPlaying) {
      player.togglePlayPause();
      return;
    }

    if (!topTracksQuery.data) {
      return;
    }

    player.playSongs(topTracksQuery.data.items, 0);
  };

  return (
    <>
      {/* Use key so components get re-rendered when navigating between artists */}
      <Fragment key={data.artist.id}>
        <Helmet>
          <title>{data.artist.name} - oto</title>
        </Helmet>

        <div
          className="h-[140px] w-full overflow-hidden rounded-xl bg-cover bg-center"
          style={{
            backgroundImage: `url(${getTidalCoverUrl(
              data.artist.albums?.[1]?.cover || data.artist.picture || data.artist.selectedAlbumCoverFallback,
              80,
            )})`,
          }}
        >
          <div
            className="h-full w-full backdrop-blur-2xl"
            style={{
              backgroundColor: "rgba(0,0,0,0.2)",
            }}
          ></div>
        </div>
        <div className="flex items-end gap-4">
          <div
            className="z-0 -mt-[40px] ml-6 aspect-square w-[180px] rounded-[45px] border-4 border-(--gray-1) bg-cover"
            style={{
              backgroundImage: data.artist.picture
                ? `url(${getTidalCoverUrl(data.artist.picture, 750)})`
                : `url(${getTidalCoverUrl(data.artist.selectedAlbumCoverFallback, 1280)})`,
            }}
          />
          <div className="flex flex-1 flex-col items-start overflow-hidden pb-3">
            <h1 className="line-clamp-1 text-4xl font-bold text-(--gray-12)">{data.artist.name}</h1>
            {data.artist.biography && (
              <p className="line-clamp-2 text-xs text-(--gray-11)">
                {parseTidalRichTextIntoComponent(
                  data.artist.biography?.slice(
                    0,
                    data.artist.biography.indexOf("<br/>") || data.artist.biography?.length,
                  ),
                )}
              </p>
            )}
            <Spacer size="2" />
            <div className="flex items-center gap-3">
              <Button
                variant="solid"
                color="blue"
                size="sm"
                isDisabled={topTracksQuery.isLoading || !topTracksQuery.data}
                isLoading={topTracksQuery.isLoading}
                onClick={handlePlayClick}
              >
                {isArtistPlaying && !playerState.isPaused && (
                  <>
                    <Pause size={16} fill="currentColor" />
                    Pause
                  </>
                )}
                {(!isArtistPlaying || playerState.isPaused) && (
                  <>
                    <Play size={16} fill="currentColor" />
                    Play
                  </>
                )}
              </Button>
              {/*<IconButton color="gray" variant="soft" icon={Heart} size="sm" />
              <IconButton color="gray" variant="soft" icon={Share} size="sm" />*/}
            </div>
          </div>
        </div>

        <Spacer size="4" />

        <Tabs.Root
          className="col-[breakout]! grid grid-cols-subgrid *:col-[content]"
          value={getActiveTab()}
          onValueChange={handleTabChange}
        >
          <Tabs.List>
            <Tabs.Tab value="overview">Overview</Tabs.Tab>
            <Tabs.TabSeparator />
            <Tabs.Tab value="albums">Albums</Tabs.Tab>
            <Tabs.TabSeparator />
            <Tabs.Tab value="singles-eps">Singles & EPs</Tabs.Tab>
            <Tabs.TabSeparator />
            <Tabs.Tab value="compilations">Compilations</Tabs.Tab>
            <Tabs.TabSeparator />
            <Tabs.Tab value="appears-on">Appears on</Tabs.Tab>
          </Tabs.List>

          <Spacer size="6" />

          <Tabs.Panel value="overview" className="col-[breakout]! grid grid-cols-subgrid px-0! *:col-[content]">
            {!isChildRoute && <ArtistPageOverview />}
          </Tabs.Panel>

          <Tabs.Panel value="albums" className="px-0!">
            <Outlet />
          </Tabs.Panel>

          <Tabs.Panel value="singles-eps" className="px-0!">
            <Outlet />
          </Tabs.Panel>

          <Tabs.Panel value="compilations" className="px-0!">
            <Outlet />
          </Tabs.Panel>

          <Tabs.Panel value="appears-on" className="px-0!">
            <Outlet />
          </Tabs.Panel>
        </Tabs.Root>
      </Fragment>
    </>
  );
};

export { loader };
export default ArtistPage;
