import { Spacer } from "@awlt/design";
import type { Album } from "../../types";
import { getTidalCoverUrl } from "../../utils/image";
import { Link } from "react-router";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";
import useAlbumPlayback from "../../hooks/useAlbumPlayback";

type TProps = {
  album: Album;
};

const LatestRelease = ({ album }: TProps) => {
  const { onPlayClick, isLoading, isPlaying } = useAlbumPlayback({
    album,
  });

  return (
    <div className="min-h-[169px] w-full h-full flex gap-4">
      <div className="h-full aspect-square">
        <CoverBlock
          variant={CoverBlockVariant.FULL}
          imageUrl={album.cover ? getTidalCoverUrl(album.cover, 320) : ""}
          linkUrl={`/albums/${album.id}`}
          onPlayClick={onPlayClick}
          isPlayLoading={isLoading}
          isPlaying={isPlaying}
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
        <p className="text-lg leading-6 font-bold w-full min-w-[170px] max-w-[170px] line-clamp-4">
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
