import type { Artist } from "../../../types";

import SearchResult from ".";
import { getTidalCoverUrl } from "../../../utils/image";

type TProps = {
  artist: Artist;
  onClose?: () => void;
};

const ArtistSearchResult = ({ artist, onClose }: TProps) => {
  return (
    <SearchResult
      primaryText={artist.name}
      secondaryText="Artist"
      imageUrl={getTidalCoverUrl(artist.picture, 320)}
      linkUrl={`/artists/${artist.id}`}
      onClose={onClose}
    />
  );
};

export default ArtistSearchResult;
