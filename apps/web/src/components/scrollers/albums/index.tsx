import clsx from "clsx";

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

const AlbumsScroller = ({ id, title, viewAllUrl, albums, showArtists = true, showDate }: TProps) => {
  return (
    <>
      <HorizontalMediaScroller
        id={id}
        title={title}
        viewAllUrl={viewAllUrl}
        className={clsx("col-[breakout]! scroll-px-(--content-side-padding) px-(--content-side-padding)")}
      >
        {albums.map((album) => (
          <AlbumsScrollerItem key={album.id} album={album} showArtists={showArtists} showDate={showDate} />
        ))}
      </HorizontalMediaScroller>
    </>
  );
};

export default AlbumsScroller;
