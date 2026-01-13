import {
  Outlet,
  useLoaderData,
  useNavigate,
  useParams,
  type LoaderFunction,
} from "react-router";
import { Fragment } from "react";
import { Link } from "react-router";
import type { ArtistPage as TArtistPage } from "../../types";
import { Button, IconButton, Spacer, Tabs } from "design";
import { Heart, Play, Share } from "lucide-react";
import ArtistPageOverview from "./overview";
import type { TabsTab } from "@base-ui/react";
import { getTidalCoverUrl } from "../../utils/image";

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
  const json: TArtistPage = await data.json();

  return { artist: json };
};

const ArtistPage = () => {
  const { id } = useParams();
  const data = useLoaderData() as { artist: TArtistPage };
  const navigate = useNavigate();

  console.log({ data });

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

  return (
    <>
      {/* Use key so components get re-rendered when navigating between artists */}
      <Fragment key={data.artist.id}>
        <div
          className="w-full h-[140px] bg-cover bg-center rounded-xl overflow-hidden"
          style={{
            backgroundImage: `url(${getTidalCoverUrl(
              data.artist.albums?.[1]?.cover ||
                data.artist.picture ||
                data.artist.selectedAlbumCoverFallback,
              1280,
            )})`,
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
                ? `url(${getTidalCoverUrl(data.artist.picture, 320)})`
                : `url(${getTidalCoverUrl(data.artist.selectedAlbumCoverFallback, 1280)})`,
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
          className="grid grid-cols-subgrid col-[breakout]! *:col-[content]"
          value={getActiveTab()}
          onValueChange={handleTabChange}
        >
          <Tabs.List className="bg-(--gray-1)!">
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

          <Tabs.Panel
            value="overview"
            className="grid grid-cols-subgrid col-[breakout]! *:col-[content]"
          >
            {!isChildRoute && <ArtistPageOverview />}
          </Tabs.Panel>

          <Tabs.Panel value="albums">
            <Outlet />
          </Tabs.Panel>

          <Tabs.Panel value="singles-eps">
            <Outlet />
          </Tabs.Panel>

          <Tabs.Panel value="compilations">
            <Outlet />
          </Tabs.Panel>

          <Tabs.Panel value="appears-on">
            <Outlet />
          </Tabs.Panel>
        </Tabs.Root>
      </Fragment>
    </>
  );
};

export { loader };
export default ArtistPage;
