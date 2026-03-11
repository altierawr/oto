import clsx from "clsx";
import { useEffect, useState } from "react";
import { Fragment } from "react/jsx-runtime";

import { usePlayerState } from "../../store";
import { formatDuration } from "../../utils/utils";

const AudioDebugger = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [, setTick] = useState(0);
  const { player, playerState } = usePlayerState();

  useEffect(() => {
    document.addEventListener("keydown", (e) => {
      if (e.key === ";" && e.ctrlKey) {
        setIsVisible(true);
      } else if (e.key === "'" && e.ctrlKey) {
        setIsVisible(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTick((prev) => (prev + 1) % 1_000_000);
    }, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isVisible]);

  if (!player.playlist) {
    return;
  }

  const currentTime = playerState.currentTime;

  return (
    <div
      className="absolute top-[20px] right-[20px] max-h-[600px] min-h-[300px] min-w-[600px] overflow-y-auto p-5"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(5px)",
        display: isVisible ? "block" : "none",
      }}
    >
      <p>Audio debugger</p>

      <p>Current time: {currentTime !== null ? formatDuration(currentTime, "digital") : "--"}</p>

      <div className="flex flex-col gap-2">
        {player.playlist.map((pe, index) => {
          const offsetPosition = currentTime !== null ? currentTime - pe.seekOffset - (pe.timestampOffset || 0) : null;
          const offsetPositionLabel =
            offsetPosition !== null
              ? `${offsetPosition.toFixed(1)} (${formatDuration(offsetPosition, "digital")})`
              : "--";

          return (
            <Fragment key={index}>
              <div>
                <p>Index {index}</p>
                {pe.timestampOffset !== null
                  ? `tOFF: ${pe.timestampOffset.toFixed(1)}, sOFF: ${pe.seekOffset.toFixed(1)}, total: ${(pe.timestampOffset + pe.seekOffset).toFixed(1)}, offsetPos: ${offsetPositionLabel}`
                  : "Not set"}
              </div>

              <div className="relative flex h-[8px] w-full">
                {pe.segments.map((seg, index) => {
                  if (!seg) {
                    return null;
                  }

                  const duration = pe.song.duration;
                  const start = seg.start + pe.seekOffset;
                  const end = seg.end + pe.seekOffset;

                  return (
                    <div
                      key={index}
                      className={clsx(seg.bufferInfo && "bg-(--green-9)", !seg.bufferInfo && "bg-(--red-9)")}
                      style={{
                        position: "absolute",
                        left: `calc(${(start / duration) * 100}% + 1px)`,
                        width: `calc(max(0.5px, ${((end - start) / duration) * 100}% - 1px))`,
                        height: "8px",
                      }}
                    ></div>
                  );
                })}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default AudioDebugger;
