import { Loader } from "@awlt/design";
import { IconPlayerPause, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward } from "@tabler/icons-react";
import clsx from "clsx";

import { usePlayerState } from "../../store";

const MusicControlsCoreControlButtons = () => {
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

  return (
    <>
      <IconPlayerSkipBack
        size={20}
        stroke={1.5}
        onClick={handlePrevClick}
        className={clsx(song && !playerState.isJumping ? "cursor-pointer" : "text-(--gray-11)")}
        fill="currentColor"
      />
      <div className={clsx(song && !playerState.isJumping && "cursor-pointer")} onClick={handlePlayPauseClick}>
        {(playerState.isBuffering || playerState.isJumping) && (
          <div className="grid aspect-square w-8 cursor-default place-content-center">
            <Loader />
          </div>
        )}

        {!playerState.isBuffering && !playerState.isJumping && (
          <div
            className={clsx(
              "grid size-8 place-items-center rounded-full bg-(--gray-12) text-(--gray-0)",
              !song && "bg-(--gray-11)!",
            )}
          >
            {!song && <IconPlayerPlay size={18} stroke={1.5} fill="currentColor" />}
            {song && (
              <>
                {playerState.isPaused ? (
                  <IconPlayerPlay size={18} stroke={1.5} fill="currentColor" />
                ) : (
                  <IconPlayerPause size={18} stroke={1.5} fill="currentColor" />
                )}
              </>
            )}
          </div>
        )}
      </div>
      <IconPlayerSkipForward
        size={20}
        stroke={1.5}
        onClick={handleNextClick}
        className={clsx(song && !playerState.isJumping ? "cursor-pointer" : "text-(--gray-11)")}
        fill="currentColor"
      />
    </>
  );
};

export default MusicControlsCoreControlButtons;
