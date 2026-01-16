import { Link, useNavigate } from "react-router";
import CoverBlock, { CoverBlockVariant } from "../../music-blocks/cover-block";
import type { MouseEvent } from "react";

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

  const sendToUrl = () => {
    onClose?.();

    if (linkUrl) {
      navigate(linkUrl);
    }
  };

  return (
    <div
      className="w-full flex gap-3 h-11 min-h-11 rounded-md p-1 transition-colors hover:bg-(--gray-2) active:bg-(--gray-3)"
      onDoubleClick={sendToUrl}
    >
      <div className="h-full aspect-square">
        <CoverBlock
          variant={coverBlockVariant}
          imageUrl={imageUrl}
          linkUrl={linkUrl}
          isPlaying={isPlaying}
          onPlayClick={onPlayClick}
        />
      </div>

      <div className="flex flex-col justify-center flex-1">
        <p className="font-semibold text-sm line-clamp-1">
          {linkUrl && (
            <Link to={linkUrl} onClick={onClose}>
              {primaryText}
            </Link>
          )}
          {!linkUrl && primaryText}
        </p>
        <p className="text-xs text-(--gray-11) line-clamp-1">{secondaryText}</p>
      </div>
    </div>
  );
};

export default SearchResult;
