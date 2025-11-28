import clsx from "clsx";
import { usePlayerState } from "../../store";
import { formatDuration } from "../../utils/utils";
import { Fragment } from "react/jsx-runtime";

const AudioDebugger = () => {
  const { player } = usePlayerState();

  if (!player.playlist) {
    return;
  }

  const audio: HTMLAudioElement = document.getElementsByTagName(
    "audio",
  )[0] as HTMLAudioElement;
  if (!audio) {
    return;
  }

  return (
    <div
      className="absolute top-[20px] right-[20px] min-w-[600px] min-h-[300px] p-5 max-h-[600px] overflow-y-auto"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(5px)",
      }}
    >
      <p>Audio debugger</p>

      <p>Current time: {formatDuration(audio.currentTime)}</p>

      <div className="flex flex-col gap-2">
        {player.playlist.map((pe, index) => (
          <Fragment key={index}>
            <div>
              <p>Index {index}</p>
              {pe.timestampOffset !== null
                ? `tOFF: ${pe.timestampOffset?.toFixed(1)}, sOFF: ${pe.seekOffset.toFixed(1)}, total: ${(pe.timestampOffset + pe.seekOffset).toFixed(1)}, offsetPos: ${(audio.currentTime - pe.seekOffset - (pe.timestampOffset || 0)).toFixed(1)} (${formatDuration(audio.currentTime - pe.seekOffset - (pe.timestampOffset || 0))})}`
                : "Not set"}
            </div>

            <div className="flex w-full relative h-[8px]">
              {pe.segments.map((seg, index) => {
                const duration = pe.song.duration;
                const start = seg.start + pe.seekOffset;
                const end = seg.end + pe.seekOffset;

                return (
                  <div
                    key={index}
                    className={clsx(
                      seg.isInBuffer && "bg-(--green-9)",
                      !seg.isInBuffer && "bg-(--red-9)",
                    )}
                    style={{
                      position: "absolute",
                      left: `calc(${(start / duration) * 100}% + 1px)`,
                      width: `calc(${((end - start) / duration) * 100}% - 1px)`,
                      height: "8px",
                    }}
                  ></div>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default AudioDebugger;
