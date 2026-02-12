import { Volume, Volume1, Volume2, VolumeOff, VolumeX } from "lucide-react";
import { useEffect, useRef } from "react";

import useBarDrag from "../../hooks/useBarDrag";
import { usePlayerState } from "../../store";

const MusicControlsVolumeControl = () => {
  const { player, playerState } = usePlayerState();

  const volumeBarRef = useRef<HTMLDivElement>(null);

  const { value: volume } = useBarDrag({
    ref: volumeBarRef,
    initialValue: playerState.volume,
  });

  useEffect(() => {
    if (volume !== null) {
      player.setVolume(volume);
    }
  }, [volume, player]);

  const handleMuteToggleClick = () => {
    player.toggleMute();
  };

  if (volume === null) {
    return;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="cursor-pointer rounded-md p-1 hover:bg-(--gray-4)" onClick={handleMuteToggleClick}>
        {playerState.isMuted && <VolumeOff size={20} strokeWidth={1.5} />}
        {!playerState.isMuted && (
          <>
            {volume === 0 && <VolumeX size={20} strokeWidth={1.5} />}
            {volume > 0 && volume < 0.1 && <Volume size={20} strokeWidth={1.5} />}
            {volume >= 0.1 && volume < 0.6 && <Volume1 size={20} strokeWidth={1.5} />}
            {volume >= 0.6 && <Volume2 size={20} strokeWidth={1.5} />}
          </>
        )}
      </div>
      <div ref={volumeBarRef} className="group relative flex h-[20px] w-[100px] cursor-pointer items-center">
        <div className="h-[6px] w-full overflow-hidden rounded-full bg-(--gray-5)">
          <div
            className="h-full bg-(--gray-11) transition-colors group-hover:bg-(--blue-11)"
            style={{
              width: `${volume * 100}%`,
            }}
          />
        </div>

        <div
          className="absolute top-[50%] h-[13px] w-[13px] -translate-x-[50%] -translate-y-[50%] rounded-full border border-(--blue-2) bg-(--blue-11) opacity-0 transition-opacity group-hover:opacity-100"
          style={{
            left: `${volume * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export default MusicControlsVolumeControl;
