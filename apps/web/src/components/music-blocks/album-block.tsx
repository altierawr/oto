import type { Album } from "../../types";

import useAlbumPlayback from "../../hooks/useAlbumPlayback";
import { getTidalCoverUrl } from "../../utils/image";
import MusicBlock from "./music-block";

type TProps = {
  album: Album;
  showArtists?: boolean;
  showDate?: boolean;
};

const AlbumBlock = ({ album, showArtists, showDate }: TProps) => {
  const { onPlayClick, isLoading, isPlaying } = useAlbumPlayback({
    album,
  });

  return (
    <MusicBlock
      title={album.title}
      linkUrl={`/albums/${album.id}`}
      imageUrls={[album.cover ? getTidalCoverUrl(album.cover, 320) : ""]}
      artists={showArtists ? album.artists : undefined}
      date={showDate ? album.releaseDate : undefined}
      onPlayClick={onPlayClick}
      isPlayLoading={isLoading}
      isPlaying={isPlaying}
    />
  );
};

export default AlbumBlock;
