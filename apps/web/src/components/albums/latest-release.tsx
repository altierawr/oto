import { Spacer } from "design";
import type { Album } from "../../types";
import { Link } from "react-router";

type TProps = {
  album: Album;
};

const LatestRelease = ({ album }: TProps) => {
  return (
    <div className="w-full h-full flex gap-4">
      <div
        className="bg-cover aspect-square rounded-md h-full"
        style={{
          backgroundImage: `url(https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/1280x1280.jpg)`,
        }}
      />
      <div className="flex-1 flex flex-col">
        <p className="text-sm uppercase font-medium">Latest release</p>
        <Spacer size="2" />
        {album.releaseDate && (
          <p className="text-(--gray-11) text-xs">
            {new Date(album.releaseDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
        <p className="text-lg leading-6 font-bold w-full min-w-[200px] line-clamp-3">
          <Link to={`/albums/${album.id}`}>{album.title}</Link>
        </p>
        {album.numberOfTracks && (
          <p className="text-(--gray-11) text-sm">
            {album.numberOfTracks} songs
          </p>
        )}
      </div>
    </div>
  );
};

export default LatestRelease;
