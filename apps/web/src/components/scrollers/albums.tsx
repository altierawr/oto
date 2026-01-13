import { usePlayerState } from "../../store";
import type { Album } from "../../types";
import HorizontalMediaScroller from "../horizonal-media-scroller";
import MusicBlock from "../music-blocks/music-block";

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
  const player = usePlayerState((s) => s.player);

  const handlePlayClick = (album: Album) => {
    // TODO: Add support to player for playing albums that don't have the songs client-side already
    if (album.songs) {
      player.playSongs(album.songs, 0);
    }
  };

  return (
    <>
      <HorizontalMediaScroller
        id={id}
        title={title}
        viewAllUrl={viewAllUrl}
        className="col-[breakout]! px-6 scroll-px-6"
      >
        {albums.map((album) => (
          <MusicBlock
            key={album.id}
            title={album.title}
            linkUrl={`/albums/${album.id}`}
            imageUrl={
              album.cover
                ? `https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/320x320.jpg`
                : ""
            }
            artists={showArtists ? album.artists : undefined}
            date={showDate ? album.releaseDate : undefined}
            onPlayClick={() => handlePlayClick(album)}
          />
        ))}
      </HorizontalMediaScroller>
    </>
  );
};

export default AlbumsScroller;
