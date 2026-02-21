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
  imageUrls: string[];
  linkUrl?: string;
  isPlaying?: boolean;
  isPlayLoading?: boolean;
  onPlayClick?: (e: MouseEvent) => void;
};

const CoverBlock = ({ variant, imageUrls, linkUrl, isPlaying, isPlayLoading, onPlayClick }: TProps) => {
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
                <Block imageUrls={imageUrls} />
                <div
                  className={clsx(
                    "absolute inset-0 h-full w-full bg-[rgba(0,0,0,0.4)] opacity-0 transition-opacity hover:opacity-100",
                    isPlaying && "opacity-100",
                  )}
                />
              </div>
            </Link>
          )}

          {!linkUrl && <Block imageUrls={imageUrls} />}
        </>
      )}

      {variant === CoverBlockVariant.PLAY_ONLY && (
        <div
          className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-md"
          onClick={handlePlayClick}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <Block imageUrls={imageUrls} showHoverZoom />
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
            <Block imageUrls={imageUrls} />
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
  imageUrls: string[];
  showHoverZoom?: boolean;
};

const getQuadrantImages = (imageUrls: string[]) => {
  if (imageUrls.length >= 4) {
    return [imageUrls[0], imageUrls[1], imageUrls[2], imageUrls[3]];
  }

  if (imageUrls.length === 3) {
    return [imageUrls[0], imageUrls[1], imageUrls[2], undefined];
  }

  if (imageUrls.length === 2) {
    return [imageUrls[0], imageUrls[1], imageUrls[0], imageUrls[1]];
  }

  return [];
};

const Block = ({ imageUrls, showHoverZoom }: TBlockProps) => {
  const validImageUrls = imageUrls.filter(Boolean).slice(0, 4);
  const quadrantImages = getQuadrantImages(validImageUrls);
  const hasSingleImage = validImageUrls.length === 1;

  return (
    <div
      className={clsx(
        "h-full w-full overflow-hidden rounded-md bg-(--gray-3) transition-transform md:rounded-xl",
        hasSingleImage && "bg-cover bg-center",
        showHoverZoom && "group-hover:scale-[0.98]",
      )}
      style={hasSingleImage ? { backgroundImage: `url(${validImageUrls[0]})` } : undefined}
    >
      {quadrantImages.length > 1 && (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2">
          {quadrantImages.map((imageUrl, index) => (
            <div
              key={index}
              className="h-full w-full bg-(--gray-3) bg-cover bg-center"
              style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CoverBlock;
