import { useLoaderData, type LoaderFunction } from "react-router";
import { Link } from "react-router";
import type { ArtistPage } from "../types";
import { Button, IconButton, Spacer } from "design";
import { Heart, Play, Share } from "lucide-react";

const parseTidalRichTextIntoComponent = (text: string) => {
  const regex = /\[wimpLink artistId="(\d+)"\](.*?)\[\/wimpLink\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [_, artistId, linkText] = match;
    const matchStart = match.index;

    // Add text before the link
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    // Add the Link component
    parts.push(
      <Link
        key={`link-${artistId}-${matchStart}`}
        to={`/artists/${artistId}`}
        className="text-(--blue-11)"
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

  return <>{parts}</>;
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
    <div className="w-full flex flex-col">
      <div
        className="w-full h-[140px] bg-cover bg-center rounded-xl overflow-hidden"
        style={{
          backgroundImage: `url(https://resources.tidal.com/images/${data.artist.albums?.[0].cover.replace(/-/g, "/")}/1280x1280.jpg)`,
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
          className="w-[180px] aspect-square rounded-[45px] border-4 border-(--gray-0) bg-cover ml-10 -mt-[40px] z-0"
          style={{
            backgroundImage: data.artist.picture
              ? `url(https://resources.tidal.com/images/${data.artist.picture?.replace(/-/g, "/")}/320x320.jpg)`
              : `url(https://resources.tidal.com/images/${data.artist.selectedAlbumCoverFallback?.replace(/-/g, "/")}/1280x1280.jpg)`,
          }}
        />
        <div className="flex flex-col items-start overflow-hidden flex-1 pb-3">
          <h1 className="text-4xl font-bold">{data.artist.name}</h1>
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
          <div className="flex gap-3">
            <Button variant="solid" color="blue" size="sm">
              <Play size={16} fill="currentColor" />
              Play Mix
            </Button>
            <IconButton color="gray" variant="soft" icon={Heart} size="sm" />
            <IconButton color="gray" variant="soft" icon={Share} size="sm" />
          </div>
        </div>
      </div>

      <Spacer size="12" />

      {data.artist.albums && (
        <>
          <h2 className="font-bold text-3xl">Albums</h2>
        </>
      )}
    </div>
  );
};

export { loader };
export default ArtistPage;
