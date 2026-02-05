import { Loader } from "@awlt/design";
import {
  IconArrowsShuffle,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconRepeat,
} from "@tabler/icons-react";
import clsx from "clsx";

import { usePlayerState } from "../../store";

const MusicControlsControlButtons = () => {
  const { player, song, playerState } = usePlayerState();

  const handlePrevClick = () => {
    if (!song || playerState.isJumping) {
      return;
    }

    player.prevTrack();
  };

  const handleNextClick = () => {
    if (!song || playerState.isJumping) {
      return;
    }

    player.nextTrack();
  };

  const handlePlayPauseClick = () => {
    if (!song || playerState.isBuffering || playerState.isJumping) {
      return;
    }

    player.togglePlayPause();
  };

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
      <IconPlayerSkipBack
        size={20}
        stroke={1.5}
        onClick={handlePrevClick}
        className={clsx(song && !playerState.isJumping && "cursor-pointer")}
      />
      <div className={clsx(song && !playerState.isJumping && "cursor-pointer")} onClick={handlePlayPauseClick}>
        {(playerState.isBuffering || playerState.isJumping) && (
          <div className="grid aspect-square w-[28px] cursor-default place-content-center">
            <Loader />
          </div>
        )}

        {!playerState.isBuffering && !playerState.isJumping && (
          <>
            {!song && <IconPlayerPlay size={28} stroke={1.5} />}
            {song && (
              <>
                {playerState.isPaused ? (
                  <IconPlayerPlay size={28} stroke={1.5} />
                ) : (
                  <IconPlayerPause size={28} stroke={1.5} />
                )}
              </>
            )}
          </>
        )}
      </div>
      <IconPlayerSkipForward
        size={20}
        stroke={1.5}
        onClick={handleNextClick}
        className={clsx(song && !playerState.isJumping && "cursor-pointer")}
      />
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

export default MusicControlsControlButtons;
