import { Link } from "react-router";

import type { Artist } from "../../types";

import { getTidalCoverUrl } from "../../utils/image";
import CoverBlock, { CoverBlockVariant } from "./cover-block";

type TProps = {
  artist: Artist;
};

const ArtistBlock = ({ artist }: TProps) => {
  return (
    <div className="snap-start">
      <div className="overflow-hidden rounded-full">
        <CoverBlock
          variant={CoverBlockVariant.COVER_ONLY}
          linkUrl={`/artists/${artist.id}`}
          imageUrl={
            artist.picture
              ? getTidalCoverUrl(artist.picture, 750)
              : getTidalCoverUrl(artist.selectedAlbumCoverFallback, 320)
          }
        />
      </div>
      <p className="mt-2 line-clamp-2 w-full text-center text-sm text-(--gray-12)">
        <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
      </p>
    </div>
  );
};

export default ArtistBlock;
