import { Spacer } from "@awlt/design";
import { Link } from "react-router";

import type { Album } from "../../types";

import useAlbumPlayback from "../../hooks/useAlbumPlayback";
import { getTidalCoverUrl } from "../../utils/image";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";

type TProps = {
  album: Album;
};

const LatestRelease = ({ album }: TProps) => {
  const { onPlayClick, isLoading, isPlaying } = useAlbumPlayback({
    album,
  });

  return (
    <div className="flex w-full gap-4 lg:h-full lg:min-h-[169px]">
      <div className="aspect-square h-[135px] lg:h-full">
        <CoverBlock
          variant={CoverBlockVariant.FULL}
          imageUrl={album.cover ? getTidalCoverUrl(album.cover, 320) : ""}
          linkUrl={`/albums/${album.id}`}
          onPlayClick={onPlayClick}
          isPlayLoading={isLoading}
          isPlaying={isPlaying}
        />
      </div>
      <div className="flex flex-1 flex-col">
        <p className="text-sm font-medium uppercase">Latest release</p>
        <Spacer size="2" />
        {album.releaseDate && (
          <p className="text-xs text-(--gray-11)">
            {new Date(album.releaseDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
        <p className="line-clamp-4 w-full max-w-[170px] min-w-[170px] text-lg leading-6 font-bold">
          <Link to={`/albums/${album.id}`}>{album.title}</Link>
        </p>
        {album.numberOfTracks && <p className="text-sm text-(--gray-11)">{album.numberOfTracks} songs</p>}
      </div>
    </div>
  );
};

export default LatestRelease;
