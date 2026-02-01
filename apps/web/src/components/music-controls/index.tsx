import clsx from "clsx";
import { TextAlignJustify } from "lucide-react";
import { useGeneralStore, usePlayerState } from "../../store";
import { formatDuration } from "../../utils/utils";
import MusicControlsSeekBar from "./seek-bar";
import MusicControlsVolumeControl from "./volume-control";
import MusicControlsSongInfo from "./song-info";
import MusicControlsControlButtons from "./control-buttons";

const MusicControls = () => {
  const { playerState, song } = usePlayerState();
  const generalState = useGeneralStore();

  const handleQueueClick = () => {
    generalState.setIsSongQueueVisible(!generalState.isSongQueueVisible);
  };

  return (
    <div className="w-full p-4 flex justify-between h-[100px] border-t border-t-(--gray-3)">
      <div className="flex-1">
        <MusicControlsSongInfo />
      </div>
      <div
        className={clsx(
          "flex-1 flex flex-col gap-2",
          !song && "text-(--gray-11)",
        )}
      >
        <MusicControlsControlButtons />
        <div className="flex items-center gap-3 text-sm">
          <p className="w-[30px]">
            {playerState.currentTime !== null
              ? formatDuration(
                  playerState.currentTime -
                    playerState.seekOffset -
                    (playerState.timestampOffset || 0),
                  "digital",
                )
              : undefined}
            {/*So that space is taken and there is no layout shift when the time pops in*/}
            {playerState.currentTime === null && (
              <span className="opacity-0">0:00</span>
            )}
          </p>
          <MusicControlsSeekBar />
          <p className="w-[30px]">
            {song ? formatDuration(song.duration, "digital") : undefined}
          </p>
        </div>
      </div>
      <div className="flex-1 flex justify-end items-center gap-6">
        {playerState && (
          <>
            <TextAlignJustify
              className="cursor-pointer"
              strokeWidth={1.5}
              onClick={handleQueueClick}
            />
            <MusicControlsVolumeControl />
          </>
        )}
      </div>
    </div>
  );
};

export default MusicControls;
