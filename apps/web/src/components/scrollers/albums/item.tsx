import type { Album } from "../../../types";
import { getTidalCoverUrl } from "../../../utils/image";
import MusicBlock from "../../music-blocks/music-block";
import useAlbumPlayback from "../../../hooks/useAlbumPlayback";

type TProps = {
  album: Album;
  showArtists?: boolean;
  showDate?: boolean;
};

const AlbumsScrollerItem = ({ album, showArtists, showDate }: TProps) => {
  const { onPlayClick, isLoading, isPlaying } = useAlbumPlayback({
    album,
  });

  return (
    <MusicBlock
      key={album.id}
      title={album.title}
      linkUrl={`/albums/${album.id}`}
      imageUrl={album.cover ? getTidalCoverUrl(album.cover, 320) : ""}
      artists={showArtists ? album.artists : undefined}
      date={showDate ? album.releaseDate : undefined}
      onPlayClick={onPlayClick}
      isPlayLoading={isLoading}
      isPlaying={isPlaying}
    />
  );
};

export default AlbumsScrollerItem;
