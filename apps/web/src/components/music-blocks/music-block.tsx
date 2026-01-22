import { Link } from "react-router";
import type { Artist } from "../../types";
import CoverBlock, { CoverBlockVariant } from "./cover-block";

type TProps = {
  title: string;
  linkUrl: string;
  imageUrl: string;
  artists?: Artist[];
  date?: string;
  isPlaying?: boolean;
  isPlayLoading?: boolean;
  onPlayClick?: () => void;
};

const MusicBlock = ({
  title,
  linkUrl,
  imageUrl,
  artists,
  date,
  isPlaying,
  isPlayLoading,
  onPlayClick,
}: TProps) => {
  return (
    <div className="grid grid-rows-[min-content] snap-start content-start">
      <CoverBlock
        variant={CoverBlockVariant.FULL}
        linkUrl={linkUrl}
        imageUrl={imageUrl}
        onPlayClick={onPlayClick}
        isPlayLoading={isPlayLoading}
        isPlaying={isPlaying}
      />
      <p className="text-(--gray-12) text-sm line-clamp-2 mt-2">
        <Link to={linkUrl}>{title}</Link>
      </p>
      <p className="text-(--gray-11) text-xs line-clamp-2">
        {artists?.map((artist, index) => (
          <span key={artist.id}>
            <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
            {index < artists.length - 1 && ", "}
          </span>
        ))}
      </p>
      {date && (
        <p className="text-(--gray-11) text-xs line-clamp-1">
          {new Date(date).getFullYear()}
        </p>
      )}
    </div>
  );
};

export default MusicBlock;
