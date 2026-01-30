import { Link } from "react-router";
import type { Song } from "../../types";
import { getTidalCoverUrl } from "../../utils/image";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";
import { useState } from "react";
import clsx from "clsx";
import { usePlayerState } from "../../store";

type TProps = {
  song: Song;
  index: number;
  coverBlockVariant?: CoverBlockVariant;
};

const SongQueueItem = ({
  song,
  index,
  coverBlockVariant = CoverBlockVariant.PLAY_ONLY,
}: TProps) => {
  const [isActive, setIsActive] = useState(false);
  const { player } = usePlayerState();

  const handlePlayClick = () => {
    player.jumpToTrack(index);
  };

  return (
    <div
      className={clsx(
        "flex gap-2 hover:bg-(--gray-4) px-3 py-2 rounded-md -ml-3",
        isActive && "bg-(--gray-5)!",
      )}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onMouseLeave={() => setIsActive(false)}
    >
      <div
        className="h-[45px] aspect-square"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <CoverBlock
          variant={coverBlockVariant}
          imageUrl={getTidalCoverUrl(song.album?.cover, 80)}
          linkUrl={song.album ? `/albums/${song.album.id}` : undefined}
          onPlayClick={handlePlayClick}
        />
      </div>

      <div className="flex flex-col justify-center">
        <p
          className="text-sm font-bold line-clamp-2 w-full"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {song.album && (
            <Link to={`/albums/${song.album.id}?song=${song.id}`}>
              {song.title}
            </Link>
          )}
          {!song.album && song.title}
        </p>
        <p
          className="text-xs text-(--gray-11) line-clamp-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {song.artists.map((artist, index) => (
            <span key={artist.id}>
              <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
              {index < song.artists.length - 1 && ", "}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
};

export default SongQueueItem;
