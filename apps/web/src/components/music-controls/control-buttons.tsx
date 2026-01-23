import {
  IconArrowsShuffle,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconRepeat,
} from "@tabler/icons-react";
import { usePlayerState } from "../../store";
import clsx from "clsx";
import { Loader } from "design";

const MusicControlsControlButtons = () => {
  const { player, song, playerState } = usePlayerState();

  const handlePrevClick = () => {
    if (!song || playerState.isBuffering) {
      return;
    }

    player.prevTrack();
  };

  const handleNextClick = () => {
    if (!song || playerState.isBuffering) {
      return;
    }

    player.nextTrack();
  };

  const handlePlayPauseClick = () => {
    if (!song || playerState.isBuffering) {
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
    <div className="flex gap-4 justify-center w-full items-center h-[28px]">
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
        className={clsx(song && !playerState.isBuffering && "cursor-pointer")}
      />
      <div
        className={clsx(song && !playerState.isBuffering && "cursor-pointer")}
        onClick={handlePlayPauseClick}
      >
        {playerState.isBuffering && (
          <div className="w-[28px] aspect-square grid place-content-center">
            <Loader />
          </div>
        )}

        {!playerState.isBuffering && (
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
        className={clsx(song && !playerState.isBuffering && "cursor-pointer")}
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
