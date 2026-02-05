import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router";

import type { Song } from "../../types";

import { usePlayerState } from "../../store";
import { getTidalCoverUrl } from "../../utils/image";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";

type TProps = {
  song: Song;
  index: number;
  coverBlockVariant?: CoverBlockVariant;
};

const SongQueueItem = ({ song, index, coverBlockVariant = CoverBlockVariant.PLAY_ONLY }: TProps) => {
  const [isActive, setIsActive] = useState(false);
  const { player } = usePlayerState();

  const handlePlayClick = () => {
    player.jumpToTrack(index);
  };

  return (
    <div
      className={clsx("-ml-3 flex gap-2 rounded-md px-3 py-2 hover:bg-(--gray-4)", isActive && "bg-(--gray-5)!")}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onMouseLeave={() => setIsActive(false)}
    >
      <div className="aspect-square h-[45px]" onMouseDown={(e) => e.stopPropagation()}>
        <CoverBlock
          variant={coverBlockVariant}
          imageUrl={getTidalCoverUrl(song.album?.cover, 80)}
          linkUrl={song.album ? `/albums/${song.album.id}` : undefined}
          onPlayClick={handlePlayClick}
        />
      </div>

      <div className="flex flex-col justify-center">
        <p className="line-clamp-2 w-full text-sm font-bold" onMouseDown={(e) => e.stopPropagation()}>
          {song.album && <Link to={`/albums/${song.album.id}?song=${song.id}`}>{song.title}</Link>}
          {!song.album && song.title}
        </p>
        <p className="line-clamp-1 text-xs text-(--gray-11)" onMouseDown={(e) => e.stopPropagation()}>
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
