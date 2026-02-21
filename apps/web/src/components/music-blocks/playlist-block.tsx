import { Link } from "react-router";

import type { UserPlaylistSummary } from "../../types";

import usePlaylistPlayback from "../../hooks/usePlaylistPlayback";
import { getCoverUrl } from "../../utils/image";
import CoverBlock, { CoverBlockVariant } from "./cover-block";

type TProps = {
  playlist: UserPlaylistSummary;
};

const PlaylistBlock = ({ playlist }: TProps) => {
  const { onPlayClick, isLoading, isPlaying } = usePlaylistPlayback({
    playlist,
  });
  const imageUrls = playlist.coverUrls.map((coverUrl) => getCoverUrl(coverUrl, 320));

  return (
    <div className="grid snap-start grid-rows-[min-content] content-start">
      <CoverBlock
        variant={CoverBlockVariant.FULL}
        linkUrl={`/playlists/${playlist.id}`}
        imageUrls={imageUrls}
        onPlayClick={onPlayClick}
        isPlayLoading={isLoading}
        isPlaying={isPlaying}
      />
      <p className="mt-2 line-clamp-2 text-sm text-(--gray-12)">
        <Link to={`/playlists/${playlist.id}`}>{playlist.name}</Link>
      </p>
      <p className="line-clamp-1 text-xs text-(--gray-11)">{playlist.numberOfTracks} tracks</p>
    </div>
  );
};

export default PlaylistBlock;
