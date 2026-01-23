import {
  IconArrowsShuffle,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconRepeat,
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
import { useEffect, useRef, useState, type MouseEventHandler } from "react";
import useLatest from "../../utils/useLatest";
import { getTidalCoverUrl } from "../../utils/image";
import { Link } from "react-router";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";
import clsx from "clsx";

const MusicControls = () => {
  const { player, playerState, song } = usePlayerState();
  const generalState = useGeneralStore();
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const [isMouseDownOnVolumeChanger, setIsMouseDownOnVolumeChanger] =
    useState(false);

  const latestIsMouseDownOnVolumeChanger = useLatest(
    isMouseDownOnVolumeChanger,
  );

  const volumeBarMouseListener = (
    e: { clientX: number },
    force: boolean = false,
  ) => {
    if (
      !volumeBarRef.current ||
      (!force && !latestIsMouseDownOnVolumeChanger.current)
    ) {
      return;
    }

    const rect = volumeBarRef.current.getBoundingClientRect();

    const percent = (e.clientX - rect.left) / rect.width;

    player.setVolume(Math.max(0, Math.min(percent, 1)));
  };

  useEffect(() => {
    const mouseUpListener = () => {
      setIsMouseDownOnVolumeChanger(false);
    };

    document.addEventListener("mouseup", mouseUpListener);
    document.addEventListener("mousemove", volumeBarMouseListener);

    return () => {
      document.removeEventListener("mouseup", mouseUpListener);
      document.removeEventListener("mousemove", volumeBarMouseListener);
    };
  }, []);

  const handlePrevClick = () => {
    if (!song) {
      return;
    }

    player.prevTrack();
  };

  const handleNextClick = () => {
    if (!song) {
      return;
    }

    player.nextTrack();
  };

  const handlePlayPauseClick = () => {
    if (!song) {
      return;
    }

    player.togglePlayPause();
  };

  const handleSeekClick: React.MouseEventHandler = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const perc = (e.clientX - rect.left) / rect.width;

    if (rect.width <= 0) {
      console.error("Rect has a width of", rect.width);
    }

    player.seek(perc);
  };

  const handleShuffleClick = () => {
    player.toggleShuffle();
  };

  const handleRepeatClick = () => {
    player.toggleRepeat();
  };

  const handleMuteToggleClick = () => {
    player.toggleMute();
  };

  const handleVolumeBarMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
    console.log("mouse down", e.clientX);
    volumeBarMouseListener(e, true);
    setIsMouseDownOnVolumeChanger(true);
  };

  const handleQueueClick = () => {
    generalState.setIsSongQueueVisible(!generalState.isSongQueueVisible);
  };

  return (
    <div className="w-full p-4 flex justify-between h-[100px] border-t border-t-(--gray-6)">
      <div className="flex-1 flex gap-3 items-center">
        {song && (
          <>
            {song.album && (
              <div className="h-full aspect-square">
                <CoverBlock
                  variant={CoverBlockVariant.COVER_ONLY}
                  imageUrl={getTidalCoverUrl(song.album.cover, 320)}
                  linkUrl={`/albums/${song.album.id}`}
                />
              </div>
            )}

            <div className="flex flex-col justify-center">
              <p className="font-bold text-sm line-clamp-2">
                {song.album && (
                  <Link to={`/albums/${song.album.id}?track=${song.id}`}>
                    {song.title}
                  </Link>
                )}
                {!song.album && song.title}
              </p>
              <p className="text-xs text-gray-11">
                {song?.artists.map((artist, index) => (
                  <span key={artist.id}>
                    <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
                    {index < song.artists.length - 1 && ", "}
                  </span>
                ))}
              </p>
            </div>
          </>
        )}
      </div>
      <div
        className={clsx(
          "flex-1 flex flex-col gap-2",
          !song && "text-(--gray-11)",
        )}
      >
        <div className="flex gap-4 justify-center w-full items-center">
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
            className={clsx(song && "cursor-pointer")}
          />
          <div
            className={clsx(song && "cursor-pointer")}
            onClick={handlePlayPauseClick}
          >
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
          </div>
          <IconPlayerSkipForward
            size={20}
            stroke={1.5}
            onClick={handleNextClick}
            className={clsx(song && "cursor-pointer")}
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

        <div className="flex items-center gap-3 text-sm">
          <p className="w-[30px]">
            {playerState.currentTime !== null
              ? formatDuration(
                  playerState.currentTime -
                    playerState.seekOffset -
                    (playerState.timestampOffset || 0),
                  "digital",
                )
              : undefined}
            {/*So that space is taken and there is no layout shift when the time pops in*/}
            {playerState.currentTime === null && (
              <span className="opacity-0">0:00</span>
            )}
          </p>
          <div className="flex-1 h-[13px] py-[4px]" onClick={handleSeekClick}>
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
                  className="h-full absolute top-0 bg-(--blue-9)"
                />
              )}

              {playerState.currentTime && song && (
                <div
                  style={{
                    width: "4px",
                    top: "-4px",
                    left: `${
                      ((playerState.currentTime -
                        playerState.seekOffset -
                        (playerState.timestampOffset || 0)) /
                        song.duration) *
                      100
                    }%`,
                  }}
                  className="h-[12px] absolute left-0 bg-(--red-9)"
                />
              )}
            </div>
          </div>
          <p>{song ? formatDuration(song.duration, "digital") : undefined}</p>
        </div>
      </div>
      <div className="flex-1 flex justify-end items-center gap-6">
        {playerState && (
          <>
            <TextAlignJustify
              className="cursor-pointer"
              strokeWidth={1.5}
              onClick={handleQueueClick}
            />
            <div className="flex items-center gap-2">
              <div onClick={handleMuteToggleClick}>
                {playerState.isMuted && <VolumeOff strokeWidth={1.5} />}
                {!playerState.isMuted && (
                  <>
                    {playerState.volume === 0 && <VolumeX strokeWidth={1.5} />}
                    {playerState.volume > 0 && playerState.volume < 0.1 && (
                      <Volume strokeWidth={1.5} />
                    )}
                    {playerState.volume >= 0.1 && playerState.volume < 0.6 && (
                      <Volume1 strokeWidth={1.5} />
                    )}
                    {playerState.volume >= 0.6 && <Volume2 strokeWidth={1.5} />}
                  </>
                )}
              </div>
              <div
                ref={volumeBarRef}
                className="w-[100px] h-[20px] flex items-center relative cursor-pointer"
                onMouseDown={handleVolumeBarMouseDown}
              >
                <div className="bg-(--gray-5) w-full h-[6px] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-(--gray-12)"
                    style={{
                      width: `${playerState.volume * 100}%`,
                    }}
                  />
                </div>

                <div
                  className="w-[7px] h-[16px] top-[50%] -translate-y-[50%] -translate-x-[50%] rounded-full bg-(--gray-12) absolute border border-(--gray-0)"
                  style={{
                    left: `${playerState.volume * 100}%`,
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MusicControls;
