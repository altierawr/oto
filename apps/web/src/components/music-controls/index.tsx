import {
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
} from "@tabler/icons-react";
import { usePlayerState } from "../../store";
import { formatDuration } from "../../utils/utils";

const MusicControls = () => {
  const playerState = usePlayerState();

  if (!playerState.playInfo) {
    return null;
  }

  const handleSeekClick: React.MouseEventHandler = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const perc = (e.clientX - rect.left) / rect.width;

    playerState.player.seek(perc);
  };

  return (
    <div className="w-full p-4 flex justify-between h-[100px] bg-(--gray-3) border-t border-t-(--gray-6)">
      <div className="flex-1 flex gap-3">
        <div
          className="h-full aspect-square bg-cover rounded-lg"
          style={{
            backgroundImage: `url(https://resources.tidal.com/images/${playerState.playInfo.song.albumCover.replace(/-/g, "/")}/1280x1280.jpg)`,
          }}
        />

        <div className="flex flex-col justify-center">
          <p className="font-bold text-sm">{playerState.playInfo.song.title}</p>
          <p className="text-xs text-gray-11">
            {playerState.playInfo.song.artistName}
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex gap-4 justify-center w-full items-center">
          <IconPlayerSkipBack size={20} stroke={1.5} />
          <IconPlayerTrackPrev size={20} stroke={1.5} />
          <IconPlayerPlay size={28} stroke={1.5} />
          <IconPlayerTrackNext size={20} stroke={1.5} />
          <IconPlayerSkipForward size={20} stroke={1.5} />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <p className="w-[30px]">
            {formatDuration(
              playerState.playInfo.currentTime -
              (playerState.playInfo.timestampOffset || 0),
            )}
          </p>
          <div className="flex-1 h-[12px] py-[4px]" onClick={handleSeekClick}>
            <div className="h-full rounded-full relative bg-(--gray-5) overflow-hidden">
              {playerState.playInfo.buffer && (
                <div
                  style={{
                    width: `${((playerState.playInfo.buffer.to -
                        playerState.playInfo.buffer.from) /
                        playerState.playInfo.song.duration) *
                      100
                      }%`,
                    left: `${((playerState.playInfo.buffer.from - (playerState.playInfo.timestampOffset || 0)) / playerState.playInfo.song.duration) * 100}%`,
                  }}
                  className="h-full absolute top-0 bg-(--blue-9)"
                />
              )}

              <div
                style={{
                  width: "4px",
                  top: "-4px",
                  left: `${((playerState.playInfo.currentTime -
                      (playerState.playInfo.timestampOffset || 0)) /
                      playerState.playInfo.song.duration) *
                    100
                    }%`,
                }}
                className="h-[12px] absolute left-0 bg-(--red-9)"
              />
            </div>
          </div>
          <p>{formatDuration(playerState.playInfo.song.duration)}</p>
        </div>
      </div>
      <div className="flex-1"></div>
    </div>
  );
};

export default MusicControls;
