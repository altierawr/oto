import SearchResult from ".";
import type { Artist } from "../../../types";

type TProps = {
  artist: Artist;
  onClose?: () => void;
};

const ArtistSearchResult = ({ artist, onClose }: TProps) => {
  return (
    <SearchResult
      primaryText={artist.name}
      secondaryText="Artist"
      imageUrl={`https://resources.tidal.com/images/${artist.picture?.replace(/-/g, "/")}/320x320.jpg`}
      linkUrl={`/artists/${artist.id}`}
      onClose={onClose}
    />
  );
};

export default ArtistSearchResult;
