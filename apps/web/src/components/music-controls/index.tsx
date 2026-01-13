import {
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import {
  TextAlignJustify,
  Volume,
  Volume1,
  Volume2,
  VolumeOff,
  VolumeX,
} from "lucide-react";
import { useGeneralStore, usePlayerState } from "../../store";
import { formatDuration } from "../../utils/utils";
import { useEffect, useRef, useState } from "react";
import useLatest from "../../utils/useLatest";
import { getTidalCoverUrl } from "../../utils/image";
import { Link } from "react-router";

const MusicControls = () => {
  const playerState = usePlayerState();
  const generalState = useGeneralStore();
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const [isMouseDownOnVolumeChanger, setIsMouseDownOnVolumeChanger] =
    useState(false);

  const latestIsMouseDownOnVolumeChanger = useLatest(
    isMouseDownOnVolumeChanger,
  );

  useEffect(() => {
    const mouseUpListener = () => {
      setIsMouseDownOnVolumeChanger(false);
    };

    const mouseMoveListener = (e: MouseEvent) => {
      if (!volumeBarRef.current || !latestIsMouseDownOnVolumeChanger.current) {
        return;
      }

      const rect = volumeBarRef.current.getBoundingClientRect();

      const percent = (e.clientX - rect.left) / rect.width;

      playerState.player.setVolume(Math.max(0, Math.min(percent, 1)));
    };

    document.addEventListener("mouseup", mouseUpListener);
    document.addEventListener("mousemove", mouseMoveListener);

    return () => {
      document.removeEventListener("mouseup", mouseUpListener);
      document.removeEventListener("mousemove", mouseMoveListener);
    };
  }, []);

  if (!playerState.playInfo) {
    return null;
  }

  const handlePrevClick = () => {
    playerState.player.prevTrack();
  };

  const handleNextClick = () => {
    playerState.player.nextTrack();
  };

  const handlePlayPauseClick = () => {
    playerState.player.togglePlayPause();
  };

  const handleSeekClick: React.MouseEventHandler = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const perc = (e.clientX - rect.left) / rect.width;

    if (rect.width <= 0) {
      console.error("Rect has a width of", rect.width);
    }

    playerState.player.seek(perc);
  };

  const handleMuteToggleClick = () => {
    playerState.player.toggleMute();
  };

  const handleVolumeBarMouseDown = () => {
    setIsMouseDownOnVolumeChanger(true);
  };

  const handleQueueClick = () => {
    generalState.setIsSongQueueVisible(!generalState.isSongQueueVisible);
  };

  return (
    <div className="w-full p-4 flex justify-between h-[100px] border-t border-t-(--gray-6)">
      <div className="flex-1 flex gap-3">
        <div
          className="h-full aspect-square bg-cover rounded-lg"
          style={{
            backgroundImage: `url(${
              playerState.playInfo.song.album?.cover
                ? getTidalCoverUrl(playerState.playInfo.song.album.cover, 80)
                : ""
            })`,
          }}
        />

        <div className="flex flex-col justify-center">
          <p className="font-bold text-sm line-clamp-2">
            {playerState.playInfo.song.title}
          </p>
          <p className="text-xs text-gray-11">
            {playerState.playInfo?.song.artists.map((artist, index) => (
              <span key={artist.id}>
                <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
                {index < playerState.playInfo!.song.artists.length - 1 && ", "}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex gap-4 justify-center w-full items-center">
          <IconPlayerSkipBack
            size={20}
            stroke={1.5}
            onClick={handlePrevClick}
            className="cursor-pointer"
          />
          <div className="cursor-pointer" onClick={handlePlayPauseClick}>
            {playerState.playInfo.isPaused ? (
              <IconPlayerPlay size={28} stroke={1.5} />
            ) : (
              <IconPlayerPause size={28} stroke={1.5} />
            )}
          </div>
          <IconPlayerSkipForward
            size={20}
            stroke={1.5}
            onClick={handleNextClick}
            className="cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <p className="w-[30px]">
            {formatDuration(
              playerState.playInfo.currentTime -
                playerState.playInfo.seekOffset -
                (playerState.playInfo.timestampOffset || 0),
              "digital",
            )}
          </p>
          <div className="flex-1 h-[13px] py-[4px]" onClick={handleSeekClick}>
            <div className="h-full rounded-full relative bg-(--gray-5) overflow-hidden">
              {playerState.playInfo.buffer && (
                <div
                  style={{
                    width: `${
                      ((playerState.playInfo.buffer.to -
                        playerState.playInfo.buffer.from) /
                        playerState.playInfo.song.duration) *
                      100
                    }%`,
                    left: `${((playerState.playInfo.buffer.from - playerState.playInfo.seekOffset - (playerState.playInfo.timestampOffset || 0)) / playerState.playInfo.song.duration) * 100}%`,
                  }}
                  className="h-full absolute top-0 bg-(--blue-9)"
                />
              )}

              <div
                style={{
                  width: "4px",
                  top: "-4px",
                  left: `${
                    ((playerState.playInfo.currentTime -
                      playerState.playInfo.seekOffset -
                      (playerState.playInfo.timestampOffset || 0)) /
                      playerState.playInfo.song.duration) *
                    100
                  }%`,
                }}
                className="h-[12px] absolute left-0 bg-(--red-9)"
              />
            </div>
          </div>
          <p>{formatDuration(playerState.playInfo.song.duration, "digital")}</p>
        </div>
      </div>
      <div className="flex-1 flex justify-end items-center gap-6">
        <TextAlignJustify
          className="cursor-pointer"
          strokeWidth={1.5}
          onClick={handleQueueClick}
        />
        <div className="flex items-center gap-2">
          <div onClick={handleMuteToggleClick}>
            {playerState.playInfo.isMuted && <VolumeOff strokeWidth={1.5} />}
            {!playerState.playInfo.isMuted && (
              <>
                {playerState.playInfo.volume === 0 && (
                  <VolumeX strokeWidth={1.5} />
                )}
                {playerState.playInfo.volume > 0 &&
                  playerState.playInfo.volume < 0.1 && (
                    <Volume strokeWidth={1.5} />
                  )}
                {playerState.playInfo.volume >= 0.1 &&
                  playerState.playInfo.volume < 0.6 && (
                    <Volume1 strokeWidth={1.5} />
                  )}
                {playerState.playInfo.volume >= 0.6 && (
                  <Volume2 strokeWidth={1.5} />
                )}
              </>
            )}
          </div>
          <div
            ref={volumeBarRef}
            className="w-[100px] h-[5px] relative rounded-full overflow-clip bg-(--gray-5)"
            onMouseDown={handleVolumeBarMouseDown}
          >
            <div
              className="absolute top-0 left-0 h-full bg-(--gray-9)"
              style={{
                width: `${playerState.playInfo.volume * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicControls;
