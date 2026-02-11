import clsx from "clsx";
import { TextAlignJustify } from "lucide-react";

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
      <div className="flex h-(--music-controls-height) w-full justify-between rounded-4xl border-t border-t-(--gray-4) bg-[color-mix(in_srgb,var(--gray-2)_80%,transparent)] p-4 shadow-2xl backdrop-blur-lg">
        <div className="flex-1">
          <MusicControlsSongInfo />
        </div>
        <div className={clsx("flex flex-1 flex-col gap-2", !song && "text-(--gray-11)")}>
          <MusicControlsControlButtons />
          <div className="flex items-center gap-3 text-sm">
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
            <>
              <TextAlignJustify className="cursor-pointer" strokeWidth={1.5} onClick={handleQueueClick} />
              <MusicControlsVolumeControl />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicControls;
