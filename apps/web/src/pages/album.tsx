import { useLoaderData, type LoaderFunction } from "react-router";
import type { Album } from "../types";
import SongList from "../components/song-list";

const loader: LoaderFunction = async ({ params }) => {
  const data = await fetch(`http://localhost:3003/v1/albums/${params.id}`);
  const json = await data.json();

  return json;
};

const AlbumPage = () => {
  const data = useLoaderData() as { album: Album };

  console.log(data.album);

  return (
    <div className="max-w-[900px]">
      <div className="flex gap-4">
        <div
          className="min-w-[200px] aspect-square bg-cover rounded-lg"
          style={{
            backgroundImage: `url(https://resources.tidal.com/images/${data.album.cover.replace(/-/g, "/")}/1280x1280.jpg)`,
          }}
        ></div>

        <div className="flex flex-col">
          <h1 className="text-4xl font-bold tracking-tight">
            {data.album.title}
          </h1>
        </div>
      </div>
      <div className="mt-4"></div>
      <SongList songs={data.album.songs} />
    </div>
  );
};

export { loader };
export default AlbumPage;
