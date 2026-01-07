import type { Album } from "../../types";
import { HorizontalMediaScroller } from "../horizonal-media-scroller";
import { Link } from "react-router";

type TProps = {
  title: string;
  viewAllUrl: string;
  albums: Album[];
};

const AlbumsScroller = ({ title, viewAllUrl, albums }: TProps) => {
  return (
    <>
      <HorizontalMediaScroller.Root
        title={title}
        viewAllUrl={viewAllUrl}
        className="col-[breakout]! px-6 scroll-px-6"
      >
        {albums.map((album) => (
          <HorizontalMediaScroller.Item key={album.id}>
            <HorizontalMediaScroller.Image
              url={`https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/320x320.jpg`}
              linkUrl={`/albums/${album.id}`}
            />
            <HorizontalMediaScroller.Title>
              <Link to={`/albums/${album.id}`}>{album.title}</Link>
            </HorizontalMediaScroller.Title>
            <HorizontalMediaScroller.Subtitle>
              {album.artists.map((artist, index) => (
                <span key={artist.id}>
                  <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
                  {index < album.artists.length - 1 && ", "}
                </span>
              ))}
            </HorizontalMediaScroller.Subtitle>
          </HorizontalMediaScroller.Item>
        ))}
      </HorizontalMediaScroller.Root>
    </>
  );
};

export default AlbumsScroller;
