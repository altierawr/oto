import { Link } from "react-router";
import type { Song } from "../../types";
import { formatDuration } from "../../utils/utils";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { usePlayerState } from "../../store";
import { Heart, ListPlus, MoreHorizontal } from "lucide-react";
import { useSearchParams } from "react-router";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import styles from "./song-list.module.css";
import { Menu } from "design";

type TProps = {
  song: Song;
  songs: Song[];
};

const SongListItem = ({ song, songs }: TProps) => {
  const [searchParams] = useSearchParams();
  const [isActive, setIsActive] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const highlightedTrackIdStr = searchParams.get("track");
  const highlightedTrackId = highlightedTrackIdStr
    ? parseInt(highlightedTrackIdStr)
    : null;

  const { player, playInfo } = usePlayerState();

  const handleClick = async () => {
    if (isPlaying) {
      player.togglePlayPause();
    } else {
      player.playSongs(songs, song.trackNumber - 1);
    }
  };

  useEffect(() => {
    if (highlightedTrackId === song.id && ref.current && !hasScrolled) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      setTimeout(() => {
        setHasScrolled(true);
      }, 15000);
    }
  }, [song, highlightedTrackId, ref, hasScrolled]);

  const handlePlayNextClick = () => {
    player.playNext(song);
  };

  const handleAddToQueueClick = () => {
    player.addToQueue(song);
  };

  const isHighlighted = !hasScrolled && song.id === highlightedTrackId;
  const isPlaying = playInfo?.song.id === song.id;

  return (
    <div
      ref={ref}
      className={clsx(
        "rounded-md py-2 group text-sm outline-2 outline-transparent",
        styles.songListItem,
        isHighlighted && "bg-(--gray-4)! outline-(--gray-7)!",
      )}
      onMouseDown={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onMouseUp={() => setIsActive(false)}
      onDoubleClick={handleClick}
      data-is-highlighted={isHighlighted}
      data-is-active={isActive}
    >
      <div
        className="text-center shrink-0 basis-[24px] cursor-pointer"
        onClick={handleClick}
      >
        <span
          className={clsx(
            !isPlaying && "group-hover:hidden",
            isPlaying && "hidden",
          )}
        >
          {song.trackNumber}
        </span>
        <div className={clsx(isPlaying && "text-(--blue-11)")}>
          {(!isPlaying || (isPlaying && playInfo?.isPaused)) && (
            <IconPlayerPlay
              className={clsx(!isPlaying && "hidden group-hover:block")}
              size={20}
              fill="currentColor"
            />
          )}

          {isPlaying && playInfo && !playInfo.isPaused && (
            <IconPlayerPause size={20} fill="currentColor" />
          )}
        </div>
      </div>
      <div className="overflow-hidden text-ellipsis text-nowrap cursor-default select-none tracking-tight">
        <p className={clsx(isPlaying && "text-(--blue-11)")}>{song.title}</p>
        {song.artists.map((artist, index) => (
          <span
            key={artist.id}
            className={clsx(
              "text-(--gray-11)",
              isPlaying && "text-(--blue-11)!",
            )}
          >
            <Link
              to={`/artists/${artist.id}`}
              className={clsx(
                "text-(--gray-11)",
                isPlaying && "text-(--blue-11)!",
              )}
            >
              {artist.name}
            </Link>
            {index < song.artists.length - 1 && ", "}
          </span>
        ))}
      </div>
      <div className="cursor-default select-none">
        {formatDuration(song.duration, "digital")}
      </div>
      <div
        className="flex items-center justify-end h-full"
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Menu.Root>
          <Menu.Trigger render={<ActionButton />}>
            <MoreHorizontal
              size={20}
              strokeWidth={1.5}
              className="opacity-0 group-hover:opacity-100"
            />
          </Menu.Trigger>
          <Menu.Content>
            <Menu.Item onClick={handlePlayNextClick}>Play Next</Menu.Item>
            <Menu.Item onClick={handleAddToQueueClick}>Add to Queue</Menu.Item>
            <Menu.Separator />
            <Menu.Item>Favorite</Menu.Item>
            <Menu.Item>Share</Menu.Item>
          </Menu.Content>
        </Menu.Root>
        <ActionButton>
          {/* The left margin is to help visually center the icon (it's not symmetrical) */}
          <ListPlus
            size={18}
            strokeWidth={1.5}
            className="opacity-0 group-hover:opacity-100 ml-[3px]"
          />
        </ActionButton>
        <ActionButton>
          <Heart size={18} strokeWidth={1.5} />
        </ActionButton>
      </div>
    </div>
  );
};

const ActionButton = ({ ...props }) => {
  return (
    <button
      className="h-full aspect-square grid place-items-center cursor-pointer hover:bg-(--gray-4) active:bg-(--gray-5) rounded-full outline-0"
      {...props}
    />
  );
};

export default SongListItem;
