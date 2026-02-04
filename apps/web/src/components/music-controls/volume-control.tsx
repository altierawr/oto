import { useEffect, useRef } from "react";
import { Volume, Volume1, Volume2, VolumeOff, VolumeX } from "lucide-react";
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
      <div onClick={handleMuteToggleClick}>
        {playerState.isMuted && <VolumeOff strokeWidth={1.5} />}
        {!playerState.isMuted && (
          <>
            {volume === 0 && <VolumeX strokeWidth={1.5} />}
            {volume > 0 && volume < 0.1 && <Volume strokeWidth={1.5} />}
            {volume >= 0.1 && volume < 0.6 && <Volume1 strokeWidth={1.5} />}
            {volume >= 0.6 && <Volume2 strokeWidth={1.5} />}
          </>
        )}
      </div>
      <div
        ref={volumeBarRef}
        className="w-[100px] h-[20px] flex items-center relative cursor-pointer"
      >
        <div className="bg-(--gray-5) w-full h-[6px] rounded-full overflow-hidden">
          <div
            className="h-full bg-(--gray-12)"
            style={{
              width: `${volume * 100}%`,
            }}
          />
        </div>

        <div
          className="w-[7px] h-[16px] top-[50%] -translate-y-[50%] -translate-x-[50%] rounded-full bg-(--gray-12) absolute border border-(--gray-0)"
          style={{
            left: `${volume * 100}%`,
          }}
        />
      </div>
    </div>
  );
};

export default MusicControlsVolumeControl;
