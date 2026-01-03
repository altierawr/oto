import { Spacer } from "design";
import type { Album } from "../../types";
import { HorizontalMediaScroller } from "../horizonal-media-scroller";
import { Link, useNavigate } from "react-router";

type TProps = {
  title: string;
  albums: Album[];
};

const AlbumsScroller = ({ title, albums }: TProps) => {
  const navigate = useNavigate();

  return (
    <>
      <h2 className="font-bold text-2xl">{title}</h2>
      <Spacer size="2" />
      <HorizontalMediaScroller.Root className="col-[breakout]! px-8 scroll-px-8">
        {albums.map((album) => (
          <HorizontalMediaScroller.Item key={album.id}>
            <HorizontalMediaScroller.Image
              url={`https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/320x320.jpg`}
              onClick={() => navigate(`/albums/${album.id}`)}
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
