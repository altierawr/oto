import type { MouseEvent } from "react";

import { Link, useNavigate } from "react-router";

import useHasTouch from "../../../hooks/useHasTouch";
import CoverBlock, { CoverBlockVariant } from "../../music-blocks/cover-block";

type TProps = {
  imageUrl: string;
  primaryText: string;
  secondaryText: string | React.ReactNode;
  linkUrl?: string;
  coverBlockVariant?: CoverBlockVariant;
  isPlaying?: boolean;
  onPlayClick?: (e: MouseEvent) => void;
  onClose?: () => void;
};

const SearchResult = ({
  imageUrl,
  primaryText,
  secondaryText,
  linkUrl,
  coverBlockVariant = CoverBlockVariant.COVER_ONLY,
  isPlaying,
  onPlayClick,
  onClose,
}: TProps) => {
  const navigate = useNavigate();
  const hasTouch = useHasTouch();

  const sendToUrl = () => {
    onClose?.();

    if (linkUrl) {
      navigate(linkUrl);
    }
  };

  return (
    <div
      className="flex h-11 min-h-11 w-full gap-3 rounded-md p-1 transition-colors hover:bg-(--gray-4) active:bg-(--gray-5)"
      onDoubleClick={sendToUrl}
      onClick={hasTouch ? sendToUrl : undefined}
    >
      <div className="aspect-square h-full">
        <CoverBlock
          variant={coverBlockVariant}
          imageUrls={[imageUrl]}
          linkUrl={linkUrl}
          isPlaying={isPlaying}
          onPlayClick={onPlayClick}
        />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <p className="line-clamp-1 text-sm font-semibold">
          {linkUrl && (
            <Link to={linkUrl} onClick={onClose}>
              {primaryText}
            </Link>
          )}
          {!linkUrl && primaryText}
        </p>
        <p className="line-clamp-1 text-xs text-(--gray-11)">{secondaryText}</p>
      </div>
    </div>
  );
};

export default SearchResult;
