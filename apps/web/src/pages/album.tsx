import { useLoaderData, type LoaderFunction } from "react-router";
import type { Album } from "../types";

const loader: LoaderFunction = async ({ params }) => {
  const data = await fetch(`http://localhost:3003/v1/albums/${params.id}`);
  const json = await data.json();

  return json;
};

const AlbumPage = () => {
  const data = useLoaderData() as { album: Album };

  return (
    <>
      <p>{data.album.title}</p>
      <div className="mt-4"></div>
      {data.album.songs.map((song) => (
        <p key={song.id}>{song.title}</p>
      ))}
    </>
  );
};

export { loader };
export default AlbumPage;
