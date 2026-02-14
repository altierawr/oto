import type { MouseEvent, MouseEventHandler } from "react";

import { Loader } from "@awlt/design";
import clsx from "clsx";
import { MoreVertical, Pause, Play } from "lucide-react";
import { Link } from "react-router";

import { usePlayerState } from "../../store";

export enum CoverBlockVariant {
  COVER_ONLY,
  PLAY_ONLY,
  FULL,
}

type TProps = {
  variant: CoverBlockVariant;
  imageUrl: string;
  linkUrl?: string;
  isPlaying?: boolean;
  isPlayLoading?: boolean;
  onPlayClick?: (e: MouseEvent) => void;
};

const CoverBlock = ({ variant, imageUrl, linkUrl, isPlaying, isPlayLoading, onPlayClick }: TProps) => {
  const { playerState } = usePlayerState();

  if (variant === CoverBlockVariant.FULL && linkUrl === undefined) {
    console.error("CoverBlock variant is FULL but link url is missing!");
  }

  const handlePlayClick: MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPlayClick?.(e);
  };

  return (
    <>
      {variant === CoverBlockVariant.COVER_ONLY && (
        <>
          {linkUrl && (
            <Link to={linkUrl}>
              <div className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-md md:rounded-xl">
                <Block imageUrl={imageUrl} />
                <div
                  className={clsx(
                    "absolute inset-0 h-full w-full bg-[rgba(0,0,0,0.4)] opacity-0 transition-opacity hover:opacity-100",
                    isPlaying && "opacity-100",
                  )}
                />
              </div>
            </Link>
          )}

          {!linkUrl && <Block imageUrl={imageUrl} />}
        </>
      )}

      {variant === CoverBlockVariant.PLAY_ONLY && (
        <div
          className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-md"
          onClick={handlePlayClick}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <Block imageUrl={imageUrl} showHoverZoom />
          <div
            className={clsx(
              "absolute inset-0 grid h-full w-full place-items-center bg-[rgba(0,0,0,0.6)] opacity-0 transition-opacity hover:opacity-100",
              isPlaying && "opacity-100",
            )}
          >
            {(!isPlaying || (isPlaying && playerState.isPaused)) && <Play size={18} fill="currentColor" />}

            {isPlaying && !playerState.isPaused && <Pause size={18} fill="currentColor" />}
          </div>
        </div>
      )}

      {variant === CoverBlockVariant.FULL && linkUrl && (
        <div className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl transition-all">
          <Link to={linkUrl}>
            <Block imageUrl={imageUrl} />
            <div
              className={clsx(
                "absolute inset-0 grid h-full w-full place-items-center bg-linear-to-b from-[rgba(0,0,0,0.25)] to-[rgba(0,0,0,0.90)] opacity-0 transition-opacity will-change-[opacity] hover:opacity-100",
                isPlaying && "opacity-100",
              )}
            >
              <div
                className="absolute bottom-3 left-3 grid aspect-square w-[40px] cursor-default place-items-center overflow-hidden rounded-full bg-[rgb(255_255_255/25%)] backdrop-blur-sm transition-all hover:scale-105"
                onClick={!isPlayLoading ? handlePlayClick : undefined}
              >
                {isPlayLoading && <Loader />}
                {!isPlayLoading && (
                  <>
                    {(!isPlaying || (isPlaying && playerState.isPaused)) && <Play size={18} fill="currentColor" />}

                    {isPlaying && !playerState.isPaused && <Pause size={18} fill="currentColor" />}
                  </>
                )}
              </div>
              <div
                className="absolute right-3 bottom-3 hidden aspect-square w-[32px] cursor-default place-items-center overflow-hidden rounded-full bg-[rgb(255_255_255/25%)] backdrop-blur-sm transition-all hover:scale-105"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical size={16} fill="currentColor" />
              </div>
            </div>
          </Link>
        </div>
      )}
    </>
  );
};

type TBlockProps = {
  imageUrl: string;
  showHoverZoom?: boolean;
};

const Block = ({ imageUrl, showHoverZoom }: TBlockProps) => {
  return (
    <div
      className={clsx(
        "h-full w-full rounded-md bg-cover transition-transform md:rounded-xl",
        showHoverZoom && "group-hover:scale-[0.98]",
      )}
      style={{
        backgroundImage: `url(${imageUrl})`,
      }}
    />
  );
};

export default CoverBlock;
