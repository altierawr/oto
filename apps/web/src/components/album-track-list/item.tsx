import { Menu } from "@awlt/design";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import clsx from "clsx";
import { Heart, HeartIcon, ListEndIcon, ListPlus, ListStartIcon, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useSearchParams } from "react-router";

import type { Song } from "../../types";

import useFavoriteTrack from "../../hooks/useFavoriteTrack";
import useHasTouch from "../../hooks/useHasTouch";
import { usePlayerState } from "../../store";
import { formatDuration } from "../../utils/utils";
import styles from "./album-track-list.module.css";

type TProps = {
  song: Song;
  songs: Song[];
};

const AlbumTrackListItem = ({ song, songs }: TProps) => {
  const [searchParams] = useSearchParams();
  const [isActive, setIsActive] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const hasTouch = useHasTouch();
  const ref = useRef<HTMLDivElement>(null);
  const { isFavorited, toggleFavorite } = useFavoriteTrack(song.id);

  const highlightedTrackIdStr = searchParams.get("track");
  const highlightedTrackId = highlightedTrackIdStr ? parseInt(highlightedTrackIdStr) : null;

  const { player, playerState, song: playerSong } = usePlayerState();

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
  const isPlaying = playerSong?.id === song.id;

  return (
    <div
      ref={ref}
      className={clsx(
        "group rounded-md py-2 text-sm outline-2 outline-transparent",
        styles.albumTrackListItem,
        isHighlighted && "bg-(--gray-4)! outline-(--gray-7)!",
      )}
      onMouseDown={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onMouseUp={() => setIsActive(false)}
      onClick={hasTouch ? handleClick : undefined}
      onDoubleClick={handleClick}
      data-is-highlighted={isHighlighted}
      data-is-active={isActive}
    >
      <div className="shrink-0 basis-[24px] cursor-pointer text-center" onClick={handleClick}>
        <span className={clsx(!isPlaying && "group-hover:hidden", isPlaying && "hidden")}>{song.trackNumber}</span>
        <div className={clsx(isPlaying && "text-(--blue-11)")}>
          {(!song || !isPlaying || (isPlaying && playerState.isPaused)) && (
            <IconPlayerPlay className={clsx(!isPlaying && "hidden group-hover:block")} size={20} fill="currentColor" />
          )}

          {isPlaying && !playerState.isPaused && <IconPlayerPause size={20} fill="currentColor" />}
        </div>
      </div>
      <div className="cursor-default overflow-hidden tracking-tight text-nowrap text-ellipsis select-none">
        <p className={clsx("truncate", isPlaying && "text-(--blue-11)")}>{song.title}</p>
        {song.artists.map((artist, index) => (
          <span key={artist.id} className={clsx("text-(--gray-11)", isPlaying && "text-(--blue-11)!")}>
            <Link to={`/artists/${artist.id}`} className={clsx("text-(--gray-11)", isPlaying && "text-(--blue-11)!")}>
              {artist.name}
            </Link>
            {index < song.artists.length - 1 && ", "}
          </span>
        ))}
      </div>
      <div className="cursor-default select-none max-sm:hidden">{formatDuration(song.duration, "digital")}</div>
      <div
        className="flex h-full items-center justify-end"
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Menu.Root>
          <Menu.Trigger render={<ActionButton />}>
            <MoreHorizontal
              size={16}
              className="text-(--gray-11) group-hover:text-(--gray-12) group-hover:opacity-100 lg:opacity-0"
            />
          </Menu.Trigger>
          <Menu.Popup>
            <Menu.Item onClick={handlePlayNextClick}>
              <ListStartIcon />
              Play Next
            </Menu.Item>
            <Menu.Item onClick={handleAddToQueueClick}>
              <ListEndIcon />
              Add to Queue
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item onClick={toggleFavorite} closeOnClick={false}>
              <HeartIcon
                fill={isFavorited ? "currentColor" : "none"}
                className={clsx(isFavorited && "text-(--red-9)!")}
              />
              {isFavorited ? "Unfavorite" : "Favorite"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Root>
        <div className="hidden">
          <ActionButton>
            {/* The left margin is to help visually center the icon (it's not symmetrical) */}
            <ListPlus size={18} strokeWidth={1.5} className="ml-[3px] opacity-0 group-hover:opacity-100" />
          </ActionButton>
          <ActionButton>
            <Heart size={18} strokeWidth={1.5} />
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ ...props }) => {
  return (
    <button
      className="grid aspect-square h-full cursor-pointer place-items-center rounded-full outline-0 hover:bg-(--gray-4) active:bg-(--gray-5)"
      {...props}
    />
  );
};

export default AlbumTrackListItem;
