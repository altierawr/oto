import clsx from "clsx";
import { ListIcon } from "lucide-react";

import { useGeneralStore, usePlayerState } from "../../store";
import { formatDuration } from "../../utils/utils";
import MusicControlsControlButtons from "./control-buttons";
import MusicControlsSeekBar from "./seek-bar";
import MusicControlsSongInfo from "./song-info";
import MusicControlsVolumeControl from "./volume-control";

const MusicControls = () => {
  const { playerState, song } = usePlayerState();
  const generalState = useGeneralStore();

  const handleQueueClick = () => {
    generalState.setIsSongQueueVisible(!generalState.isSongQueueVisible);
  };

  return (
    <div className="sticky bottom-0 z-50 col-[breakout]! flex items-center justify-center p-3">
      <div className="hidden w-full justify-between rounded-3xl border-t border-t-(--gray-4) bg-[color-mix(in_srgb,var(--gray-2)_80%,transparent)] px-6 py-4 shadow-2xl backdrop-blur-lg lg:flex lg:h-[90px]">
        <div className="flex-1">
          <MusicControlsSongInfo />
        </div>
        <div className={clsx("flex flex-1 flex-col gap-2", !song && "text-(--gray-11)")}>
          <MusicControlsControlButtons />
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
    </div>
  );
};

export default MusicControls;
