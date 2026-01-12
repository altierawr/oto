import { Link, useLoaderData, type LoaderFunction } from "react-router";
import { Button, IconButton } from "design";
import type { Album } from "../types";
import SongList from "../components/song-list";
import { Heart, Play, Share } from "lucide-react";
import { usePlayerState } from "../store";
import { formatDuration } from "../utils/utils";
import clsx from "clsx";
import CoverBlock, {
  CoverBlockVariant,
} from "../components/music-blocks/cover-block";

const loader: LoaderFunction = async ({ params }) => {
  const data = await fetch(`http://localhost:3003/v1/albums/${params.id}`);
  const json = await data.json();

  return { album: json };
};

const AlbumPage = () => {
  const data = useLoaderData() as { album: Album };
  const player = usePlayerState((s) => s.player);

  const handlePlayClick = async () => {
    if (data.album.songs) {
      player.playSongs(data.album.songs, 0);
    }
  };

  return (
    <div className="max-w-[900px]">
      <div className="flex gap-4">
        <div className="min-w-[200px] aspect-square">
          <CoverBlock
            variant={CoverBlockVariant.COVER_ONLY}
            imageUrl={`https://resources.tidal.com/images/${data.album.cover.replace(/-/g, "/")}/1280x1280.jpg`}
          />
        </div>

        <div className="flex flex-col justify-between items-start">
          <div>
            <h1
              className={clsx(
                "font-bold",
                "tracking-tight",
                data.album.title.length <= 45 && "text-5xl",
                data.album.title.length > 45 && "text-4xl",
                "line-clamp-2",
              )}
            >
              {data.album.title}
            </h1>
            <p className="text-sm">
              Album by{" "}
              <Link
                to={`/artists/${data.album.artists[0].id}`}
                className="text-(--blue-11)"
              >
                {data.album.artists[0].name}
              </Link>
            </p>
            <p className="text-sm">
              {data.album.releaseDate.slice(0, 4)} • {data.album.numberOfTracks}{" "}
              songs • {formatDuration(data.album.duration, "written")}
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="solid" color="blue" onClick={handlePlayClick}>
              <Play size={16} fill="currentColor" />
              Play Album
            </Button>
            <IconButton color="gray" variant="soft" icon={Heart} />
            <IconButton color="gray" variant="soft" icon={Share} />
          </div>
        </div>
      </div>
      <div className="mt-4"></div>
      {data.album.songs && <SongList songs={data.album.songs} />}
    </div>
  );
};

export { loader };
export default AlbumPage;
