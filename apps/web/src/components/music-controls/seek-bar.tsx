import { useEffect, useRef, useState } from "react";
import useBarDrag from "../../hooks/useBarDrag";
import { usePlayerState } from "../../store";
import clsx from "clsx";

const MusicControlsSeekBar = () => {
  const { player, playerState, song } = usePlayerState();
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);

  const onMouseUp = (newValue: number) => {
    player.seek(newValue);
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
    ? playerState.currentTime -
      playerState.seekOffset -
      (playerState.timestampOffset || 0)
    : null;

  return (
    <div
      ref={seekBarRef}
      className="flex-1 h-[13px] py-[4px] cursor-pointer relative"
    >
      {offsetTime && song && (
        <div
          className={clsx(
            "opacity-0 w-[7px] h-[16px] z-10 top-[50%] -translate-y-[50%] -translate-x-[50%] rounded-full bg-(--gray-12) absolute border border-(--gray-0)",
            isDragging && "opacity-100",
          )}
          style={{
            left: `${
              (dragValue
                ? dragValue * song.duration
                : offsetTime / song.duration) * 100
            }%`,
          }}
        />
      )}
      <div className="h-full rounded-full relative bg-(--gray-5) overflow-hidden">
        {playerState.buffer && song && (
          <div
            style={{
              width: `${
                ((playerState.buffer.to - playerState.buffer.from) /
                  song.duration) *
                100
              }%`,
              left: `${((playerState.buffer.from - playerState.seekOffset - (playerState.timestampOffset || 0)) / song.duration) * 100}%`,
            }}
            className="hidden h-full absolute top-0 bg-(--blue-9)"
          />
        )}

        {offsetTime && song && (
          <div
            style={{
              width: `${(offsetTime / song.duration) * 100}%`,
            }}
            className="h-full absolute top-0 left-0 bg-(--gray-12)"
          />
        )}
      </div>
    </div>
  );
};

export default MusicControlsSeekBar;
