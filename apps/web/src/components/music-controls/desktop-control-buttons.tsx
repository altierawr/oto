import { IconArrowsShuffle, IconRepeat } from "@tabler/icons-react";
import clsx from "clsx";

import { usePlayerState } from "../../store";
import MusicControlsCoreControlButtons from "./core-control-buttons";

const MusicControlsDesktopControlButtons = () => {
  const { player, playerState } = usePlayerState();

  const handleShuffleClick = () => {
    player.toggleShuffle();
  };

  const handleRepeatClick = () => {
    player.toggleRepeat();
  };

  return (
    <div className="flex h-[28px] w-full items-center justify-center gap-4">
      <IconArrowsShuffle
        size={20}
        stroke={1.5}
        onClick={handleShuffleClick}
        className={clsx(
          "cursor-pointer",
          !playerState.isShuffleEnabled && "text-(--gray-11)",
          playerState.isShuffleEnabled && "text-(--blue-11)",
        )}
      />
      <MusicControlsCoreControlButtons />
      <IconRepeat
        size={20}
        stroke={1.5}
        onClick={handleRepeatClick}
        className={clsx(
          "cursor-pointer",
          !playerState?.isRepeatEnabled && "text-(--gray-11)",
          playerState?.isRepeatEnabled && "text-(--blue-11)",
        )}
      />
    </div>
  );
};

export default MusicControlsDesktopControlButtons;
