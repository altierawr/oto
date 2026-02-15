import type { Album } from "../../../types";

import AlbumBlock from "../../music-blocks/album-block";

type TProps = {
  album: Album;
  showArtists?: boolean;
  showDate?: boolean;
};

const AlbumsScrollerItem = ({ album, showArtists, showDate }: TProps) => {
  return <AlbumBlock album={album} showArtists={showArtists} showDate={showDate} />;
};

export default AlbumsScrollerItem;
