import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import useBarDrag from "../../hooks/useBarDrag";
import { usePlayerState } from "../../store";

const MusicControlsSeekBar = () => {
  const { player, playerState, song } = usePlayerState();
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);

  const onMouseUp = async (newValue: number) => {
    await player.seek(newValue);

    setDragValue(null);
  };

  const { value, isDragging } = useBarDrag({
    ref: seekBarRef,
    initialValue: null,
    onMouseUp,
  });

  useEffect(() => {
    setDragValue(value);
  }, [value]);

  const offsetTime = playerState.currentTime
    ? playerState.currentTime - playerState.seekOffset - (playerState.timestampOffset || 0)
    : null;

  return (
    <div
      ref={seekBarRef}
      className={clsx(
        "group relative h-[13px] w-[300px] py-[4px] select-none",
        song && !playerState.isBuffering && "cursor-pointer",
      )}
    >
      {offsetTime !== null && song && (
        <div
          className={clsx(
            "absolute top-[50%] z-10 h-[14px] w-[6px] -translate-x-[50%] -translate-y-[50%] rounded-full border border-(--gray-0) bg-(--gray-12) opacity-0 transition-opacity group-hover:opacity-100!",
            isDragging && "opacity-100",
          )}
          style={{
            left: `${(dragValue !== null ? dragValue : offsetTime / song.duration) * 100}%`,
          }}
        />
      )}
      <div className="relative h-full overflow-hidden rounded-full bg-(--gray-5)">
        {playerState.buffer && song && (
          <div
            style={{
              width: `${((playerState.buffer.to - playerState.buffer.from) / song.duration) * 100}%`,
              left: `${((playerState.buffer.from - playerState.seekOffset - (playerState.timestampOffset || 0)) / song.duration) * 100}%`,
            }}
            className="absolute top-0 hidden h-full bg-(--blue-9)"
          />
        )}

        {offsetTime && song && (
          <div
            style={{
              width: `${(dragValue ? dragValue : offsetTime / song.duration) * 100}%`,
            }}
            className="absolute top-0 left-0 h-full bg-(--gray-12)"
          />
        )}
      </div>
    </div>
  );
};

export default MusicControlsSeekBar;
