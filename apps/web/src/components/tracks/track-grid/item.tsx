import clsx from "clsx";
import { MoreHorizontalIcon } from "lucide-react";
import { Link } from "react-router";

import type { Song } from "../../../types";

import { usePlayerState } from "../../../store";
import { getTidalCoverUrl } from "../../../utils/image";
import CoverBlock, { CoverBlockVariant } from "../../music-blocks/cover-block";
import TrackActionsMenu from "../track-actions-menu";

type TProps = {
  track: Song;
  tracks: Song[];
  trackIndex: number;
  isLoading?: boolean;
};

const TrackGridItem = ({ track, tracks, trackIndex, isLoading }: TProps) => {
  const { player, song } = usePlayerState((s) => s);
  const isPlaying = song?.id === track.id;

  const handlePlayClick = () => {
    if (isPlaying) {
      player.togglePlayPause();
    } else {
      player.playSongs(tracks, trackIndex);
    }
  };

  return (
    <div
      className={clsx(
        "group flex h-full snap-start items-center gap-3 border-t border-(--gray-3) py-2",
        ((trackIndex + 1) % 3 === 0 || (trackIndex === tracks.length - 1 && !isLoading)) && "border-b",
      )}
    >
      <div className="aspect-square h-[40px]">
        <CoverBlock
          variant={CoverBlockVariant.PLAY_ONLY}
          imageUrls={[track.album?.cover ? getTidalCoverUrl(track.album.cover, 80) : ""]}
          isPlaying={isPlaying}
          onPlayClick={handlePlayClick}
        />
      </div>

      <div className="flex-1">
        <p className="line-clamp-1 text-sm font-normal">
          {track.album && <Link to={`/albums/${track.album.id}?track=${track.id}`}>{track.title}</Link>}
          {!track.album && track.title}
        </p>
        <p className="line-clamp-1 text-xs text-(--gray-11)">
          {track.artists.map((artist, index) => (
            <span key={artist.id}>
              <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
              {index < track.artists.length - 1 && ", "}
            </span>
          ))}
        </p>
      </div>
      <div
        className="flex h-full items-center justify-end"
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <TrackActionsMenu
          track={track}
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
      className="grid size-9 cursor-pointer place-items-center rounded-full transition-colors hover:bg-(--gray-4) active:bg-(--gray-5)"
      {...props}
    />
  );
};

export default TrackGridItem;
