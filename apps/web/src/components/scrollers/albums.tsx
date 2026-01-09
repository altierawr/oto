import { usePlayerState } from "../../store";
import type { Album } from "../../types";
import { HorizontalMediaScroller } from "../horizonal-media-scroller";
import { Link } from "react-router";

type TProps = {
  id: string;
  title: string;
  viewAllUrl: string;
  albums: Album[];
};

const AlbumsScroller = ({ id, title, viewAllUrl, albums }: TProps) => {
  const player = usePlayerState((s) => s.player);

  const handlePlayClick = (album: Album) => {
    // TODO: Add support to player for playing albums that don't have the songs client-side already
    if (album.songs) {
      player.playSongs(album.songs, 0);
    }
  };

  return (
    <>
      <HorizontalMediaScroller.Root
        id={id}
        title={title}
        viewAllUrl={viewAllUrl}
        className="col-[breakout]! px-6 scroll-px-6"
      >
        {albums.map((album) => (
          <HorizontalMediaScroller.Item key={album.id}>
            <HorizontalMediaScroller.Image
              url={`https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/320x320.jpg`}
              linkUrl={`/albums/${album.id}`}
              onPlayClick={() => handlePlayClick(album)}
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
