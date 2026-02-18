import clsx from "clsx";
import { HeartIcon, ListIcon } from "lucide-react";

import useFavoriteTrack from "../../hooks/useFavoriteTrack";
import { useGeneralStore, usePlayerState } from "../../store";
import { formatDuration } from "../../utils/utils";
import MusicControlsDesktopControlButtons from "./desktop-control-buttons";
import MusicControlsSeekBar from "./seek-bar";
import MusicControlsSongInfo from "./song-info";
import MusicControlsVolumeControl from "./volume-control";

type TProps = {
  className?: string;
};

const MusicControlsDesktop = ({ className }: TProps) => {
  const { playerState, song } = usePlayerState();
  const generalState = useGeneralStore();
  const { isFavorited, toggleFavorite } = useFavoriteTrack(song?.id);

  const handleQueueClick = () => {
    generalState.setIsSongQueueVisible(!generalState.isSongQueueVisible);
  };

  return (
    <div className={clsx("flex h-full w-full", className)}>
      <div className="flex-1">
        <MusicControlsSongInfo />
      </div>
      <div className={clsx("flex flex-1 flex-col gap-2", !song && "text-(--gray-11)")}>
        <MusicControlsDesktopControlButtons />
        <div className="flex items-center justify-center gap-3 text-sm">
          <p className="w-[30px]">
            {playerState.currentTime !== null
              ? formatDuration(
                  playerState.currentTime - playerState.seekOffset - (playerState.timestampOffset || 0),
                  "digital",
                )
              : undefined}
            {/*So that space is taken and there is no layout shift when the time pops in*/}
            {playerState.currentTime === null && <span className="opacity-0">0:00</span>}
          </p>
          <MusicControlsSeekBar />
          <p className="w-[30px]">{song ? formatDuration(song.duration, "digital") : undefined}</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-end gap-6">
        {playerState && (
          <div className="grid">
            <div className="flex items-center justify-end gap-1">
              <div
                className={clsx(
                  "grid size-7 place-items-center rounded-md transition-colors",
                  song && "cursor-pointer hover:bg-(--gray-4) active:bg-(--gray-5)",
                  isFavorited && "text-(--red-9)",
                )}
                onClick={song ? toggleFavorite : undefined}
              >
                <HeartIcon
                  size={18}
                  strokeWidth={1.5}
                  fill={isFavorited ? "currentColor" : "transparent"}
                  className="transition-colors"
                />
              </div>
              <div
                className="grid size-7 cursor-pointer place-items-center rounded-md transition-colors hover:bg-(--gray-4) active:bg-(--gray-5)"
                onClick={handleQueueClick}
              >
                <ListIcon size={20} strokeWidth={1.5} />
              </div>
            </div>
            <MusicControlsVolumeControl />
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicControlsDesktop;
