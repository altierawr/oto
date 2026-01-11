import { Spacer } from "design";
import type { Album } from "../../types";
import { Link } from "react-router";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";

type TProps = {
  album: Album;
};

const LatestRelease = ({ album }: TProps) => {
  return (
    <div className="w-full h-full flex gap-4">
      <div className="h-full aspect-square">
        <CoverBlock
          variant={CoverBlockVariant.FULL}
          imageUrl={`https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/320x320.jpg`}
          linkUrl={`/albums/${album.id}`}
        />
      </div>
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
