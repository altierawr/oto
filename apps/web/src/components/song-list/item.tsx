import { Link } from "react-router";
import type { Song } from "../../types";
import { formatDuration } from "../../utils/utils";
import { IconPlayerPlay } from "@tabler/icons-react";
import { usePlayerState, useScrollStore } from "../../store";
import { Heart, ListPlus, MoreHorizontal } from "lucide-react";
import { useSearchParams } from "react-router";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import styles from "./song-list.module.css";

type TProps = {
  song: Song;
  songs: Song[];
};

const SongListItem = ({ song, songs }: TProps) => {
  const [searchParams] = useSearchParams();
  const [hasScrolled, setHasScrolled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useScrollStore((state) => state.scrollRef);

  const highlightedTrackIdStr = searchParams.get("track");
  const highlightedTrackId = highlightedTrackIdStr
    ? parseInt(highlightedTrackIdStr)
    : null;

  const player = usePlayerState((s) => s.player);

  const handleClick = async () => {
    player.playSongs(songs, song.trackNumber - 1);
  };

  useEffect(() => {
    if (
      highlightedTrackId === song.id &&
      scrollRef?.current &&
      ref.current &&
      !hasScrolled
    ) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setTimeout(() => {
        setHasScrolled(true);
      }, 15000);
    }
  }, [song, highlightedTrackId, scrollRef, ref, hasScrolled]);

  const isHighlighted = !hasScrolled && song.id === highlightedTrackId;

  return (
    <div
      ref={ref}
      className={clsx(
        "rounded-md py-2 group text-sm outline-2 outline-transparent",
        styles.songListItem,
        isHighlighted && "bg-(--gray-4)! outline-(--gray-7)!",
      )}
      onDoubleClick={handleClick}
      data-is-highlighted={isHighlighted}
    >
      <div
        className="text-center shrink-0 basis-[24px] cursor-pointer"
        onClick={handleClick}
      >
        <span className="group-hover:hidden">{song.trackNumber}</span>
        <IconPlayerPlay
          className="hidden group-hover:block"
          size={20}
          fill="currentColor"
        />
      </div>
      <div className="overflow-hidden text-ellipsis text-nowrap cursor-default select-none tracking-tight">
        <p className="">{song.title}</p>
        {song.artists.map((artist, index) => (
          <span key={artist.id} className="text-(--gray-11)">
            <Link to={`/artists/${artist.id}`} className="text-(--gray-11)!">
              {artist.name}
            </Link>
            {index < song.artists.length - 1 && ", "}
          </span>
        ))}
      </div>
      <div className="cursor-default select-none">
        {formatDuration(song.duration, "digital")}
      </div>
      <div className="flex items-center justify-end h-full">
        <div className="h-full aspect-square grid place-items-center cursor-pointer hover:bg-(--gray-4) rounded-full">
          <MoreHorizontal
            size={20}
            strokeWidth={1.5}
            className="opacity-0 group-hover:opacity-100"
          />
        </div>
        <div className="h-full aspect-square grid place-items-center cursor-pointer hover:bg-(--gray-4) rounded-full">
          {/* The left margin is to help visually center the icon (it's not symmetrical) */}
          <ListPlus
            size={18}
            strokeWidth={1.5}
            className="opacity-0 group-hover:opacity-100 ml-[3px]"
          />
        </div>
        <div className="h-full aspect-square grid place-items-center cursor-pointer hover:bg-(--gray-4) rounded-full">
          <Heart size={18} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};

export default SongListItem;
