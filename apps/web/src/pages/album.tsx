import { useLoaderData, type LoaderFunction } from "react-router";
import { Button, IconButton } from "design";
import type { Album } from "../types";
import SongList from "../components/song-list";
import { Heart, Play, Share } from "lucide-react";
import { usePlayerState } from "../store";

const loader: LoaderFunction = async ({ params }) => {
  const data = await fetch(`http://localhost:3003/v1/albums/${params.id}`);
  const json = await data.json();

  return json;
};

const AlbumPage = () => {
  const data = useLoaderData() as { album: Album };
  const player = usePlayerState((s) => s.player);

  const handlePlayClick = async () => {
    player.playSongs(data.album.songs, 0);
  };

  return (
    <div className="max-w-[900px]">
      <div className="flex gap-4">
        <div
          className="min-w-[200px] aspect-square bg-cover rounded-lg"
          style={{
            backgroundImage: `url(https://resources.tidal.com/images/${data.album.cover.replace(/-/g, "/")}/1280x1280.jpg)`,
          }}
        ></div>

        <div className="flex flex-col justify-between items-start">
          <h1 className="text-4xl font-bold tracking-tight">
            {data.album.title}
          </h1>
          <div className="flex gap-4">
            <Button color="blue" onClick={handlePlayClick}>
              <Play size={16} fill="currentColor" />
              Play Album
            </Button>
            <IconButton color="gray" variant="soft">
              <Heart size={16} />
            </IconButton>
            <IconButton color="gray" variant="soft">
              <Share size={16} />
            </IconButton>
          </div>
        </div>
      </div>
      <div className="mt-4"></div>
      <SongList songs={data.album.songs} />
    </div>
  );
};

export { loader };
export default AlbumPage;
