import { Button } from "@awlt/design";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import clsx from "clsx";
import { MoreHorizontalIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useSearchParams } from "react-router";

import type { Song } from "../../types";

import useHasTouch from "../../hooks/useHasTouch";
import { usePlayerState } from "../../store";
import { getTidalCoverUrl } from "../../utils/image";
import { formatDuration } from "../../utils/utils";
import TrackActionsMenu from "../tracks/track-actions-menu";
import styles from "./mixed-track-list.module.css";

type TProps = {
  song: Song;
  songs: Song[];
  trackIndex: number;
  overlay?: {
    text: string;
    onClick: () => void;
  };
};

const MixedTrackListItem = ({ song, songs, trackIndex, overlay }: TProps) => {
  const [searchParams] = useSearchParams();
  const [isActive, setIsActive] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const hasTouch = useHasTouch();
  const ref = useRef<HTMLDivElement>(null);

  const highlightedTrackIdStr = searchParams.get("track");
  const highlightedTrackId = highlightedTrackIdStr ? parseInt(highlightedTrackIdStr) : null;

  const { player, playerState, song: playerSong } = usePlayerState();

  const handleClick = async () => {
    if (overlay !== undefined) {
      return;
    }

    if (isPlaying) {
      player.togglePlayPause();
    } else {
      player.playSongs(songs, trackIndex);
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

  const isHighlighted = overlay === undefined && !hasScrolled && song.id === highlightedTrackId;
  const isPlaying = playerSong?.id === song.id;

  return (
    <div
      ref={ref}
      className={clsx(
        "relative rounded-md py-2 text-sm outline-2 outline-transparent",
        styles.mixedTrackListItem,
        isHighlighted && "bg-(--gray-4)! outline-(--gray-7)!",
        overlay !== undefined && "pointer-events-none *:pointer-events-none",
        overlay === undefined && "group",
      )}
      onMouseDown={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onMouseUp={() => setIsActive(false)}
      onClick={!overlay && hasTouch ? handleClick : undefined}
      onDoubleClick={handleClick}
      data-is-highlighted={isHighlighted}
      data-is-active={isActive}
      data-is-interactable={overlay === undefined}
    >
      {overlay && (
        <div
          className="pointer-events-auto absolute inset-0 grid h-full w-full place-items-center *:pointer-events-auto"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in srgb, var(--gray-1) 80%, transparent), var(--gray-1) 100%)",
          }}
        >
          <Button size="sm" onClick={overlay.onClick}>
            {overlay.text}
          </Button>
        </div>
      )}

      <div className="shrink-0 basis-[24px] cursor-pointer text-center" onClick={handleClick}>
        <span className={clsx("select-none", !isPlaying && "group-hover:hidden", isPlaying && "hidden")}>
          {trackIndex + 1}
        </span>
        <div className={clsx(isPlaying && "text-(--blue-11)")}>
          {(!song || !isPlaying || (isPlaying && playerState.isPaused)) && (
            <IconPlayerPlay className={clsx(!isPlaying && "hidden group-hover:block")} size={20} fill="currentColor" />
          )}

          {isPlaying && !playerState.isPaused && <IconPlayerPause size={20} fill="currentColor" />}
        </div>
      </div>

      {song.album?.id && (
        <Link to={`/albums/${song.album.id}?track=${song.id}`} className="size-8 shrink-0 overflow-hidden rounded-sm">
          <div className="size-full bg-(--gray-3)">
            {song.album.cover && (
              <img
                src={getTidalCoverUrl(song.album.cover, 80)}
                alt=""
                className="size-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        </Link>
      )}

      {!song.album?.id && <div className="size-8 shrink-0 rounded-sm bg-(--gray-3)" />}

      <div className="cursor-default overflow-hidden tracking-tight text-nowrap text-ellipsis select-none">
        {song.album?.id ? (
          <>
            <Link to={`/albums/${song.album.id}?track=${song.id}`} className={clsx(isPlaying && "text-(--blue-11)")}>
              {song.title}
            </Link>
            <br />
          </>
        ) : (
          <p className={clsx("truncate", isPlaying && "text-(--blue-11)")}>{song.title}</p>
        )}
        {song.artists.map((artist, index) => (
          <span key={artist.id} className={clsx("text-(--gray-11)", isPlaying && "text-(--blue-11)!")}>
            <Link to={`/artists/${artist.id}`} className={clsx("text-(--gray-11)", isPlaying && "text-(--blue-11)!")}>
              {artist.name}
            </Link>
            {index < song.artists.length - 1 && ", "}
          </span>
        ))}
      </div>

      <div className="overflow-hidden text-nowrap text-ellipsis text-(--gray-11) max-sm:hidden">
        {song.album?.id ? (
          <Link to={`/albums/${song.album.id}?track=${song.id}`} className="hover:text-(--gray-12)">
            {song.album.title}
          </Link>
        ) : (
          "-"
        )}
      </div>

      <div className="cursor-default select-none max-sm:hidden">{formatDuration(song.duration, "digital")}</div>

      <div
        className="flex h-full items-center justify-end"
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <TrackActionsMenu
          track={song}
          triggerRender={
            <ActionButton>
              <MoreHorizontalIcon
                size={16}
                className="text-(--gray-11) group-hover:text-(--gray-12) group-hover:opacity-100 lg:opacity-0"
              />
            </ActionButton>
          }
        />
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

export default MixedTrackListItem;
