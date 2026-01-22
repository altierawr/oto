import type { Album } from "../../../types";
import HorizontalMediaScroller from "../../horizonal-media-scroller";
import AlbumsScrollerItem from "./item";

type TProps = {
  id: string;
  title: string;
  viewAllUrl: string;
  albums: Album[];
  showArtists?: boolean;
  showDate?: boolean;
};

const AlbumsScroller = ({
  id,
  title,
  viewAllUrl,
  albums,
  showArtists = true,
  showDate,
}: TProps) => {
  return (
    <>
      <HorizontalMediaScroller
        id={id}
        title={title}
        viewAllUrl={viewAllUrl}
        className="col-[breakout]! px-6 scroll-px-6"
      >
        {albums.map((album) => (
          <AlbumsScrollerItem
            key={album.id}
            album={album}
            showArtists={showArtists}
            showDate={showDate}
          />
        ))}
      </HorizontalMediaScroller>
    </>
  );
};

export default AlbumsScroller;
