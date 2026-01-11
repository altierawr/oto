import clsx from "clsx";
import { MoreVertical, Play } from "lucide-react";
import type { MouseEventHandler } from "react";
import { Link } from "react-router";

export enum CoverBlockVariant {
  COVER_ONLY,
  PLAY_ONLY,
  FULL,
}

type TProps = {
  variant: CoverBlockVariant;
  imageUrl: string;
  linkUrl?: string;
  onPlayClick?: () => void;
};

const CoverBlock = ({ variant, imageUrl, linkUrl, onPlayClick }: TProps) => {
  if (variant === CoverBlockVariant.FULL && linkUrl === undefined) {
    console.error("CoverBlock variant is FULL but link url is missing!");
  }

  const handlePlayClick: MouseEventHandler = (e) => {
    e.preventDefault();
    onPlayClick?.();
  };

  return (
    <>
      {variant === CoverBlockVariant.COVER_ONLY && (
        <Block imageUrl={imageUrl} />
      )}

      {variant === CoverBlockVariant.PLAY_ONLY && (
        <div
          className="w-full aspect-square relative rounded-md overflow-hidden cursor-pointer group"
          onClick={handlePlayClick}
        >
          <Block imageUrl={imageUrl} showHoverZoom />
          <div className="absolute w-full h-full inset-0 opacity-0 hover:opacity-100 bg-[rgba(0,0,0,0.6)] transition-opacity grid place-items-center">
            <Play size={18} fill="currentColor" />
          </div>
        </div>
      )}

      {variant === CoverBlockVariant.FULL && linkUrl && (
        <div className="w-full aspect-square rounded-md cursor-pointer transition-all relative overflow-hidden group">
          <Link to={linkUrl}>
            <Block imageUrl={imageUrl} />
            <div className="absolute w-full h-full inset-0 opacity-0 hover:opacity-100 will-change-[opacity] transition-opacity bg-linear-to-b from-[rgba(0,0,0,0.25)] to-[rgba(0,0,0,0.90)] grid place-items-center">
              <div
                className="absolute bottom-3 left-3 rounded-full overflow-hidden w-[40px] aspect-square cursor-default bg-[rgb(255_255_255/25%)] backdrop-blur-sm grid place-items-center transition-all hover:scale-105"
                onClick={handlePlayClick}
              >
                <Play size={20} fill="currentColor" />
              </div>
              <div
                className="absolute bottom-3 right-3 rounded-full overflow-hidden w-[32px] aspect-square cursor-default bg-[rgb(255_255_255/25%)] backdrop-blur-sm grid place-items-center transition-all hover:scale-105"
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
        "w-full h-full bg-cover rounded-md transition-transform",
        showHoverZoom && "group-hover:scale-[0.98]",
      )}
      style={{
        backgroundImage: `url(${imageUrl})`,
      }}
    />
  );
};

export default CoverBlock;
