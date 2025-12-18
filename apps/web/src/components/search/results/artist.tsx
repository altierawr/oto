import { Link } from "react-router";
import SearchResult from ".";
import type { Artist } from "../../../types";

type TProps = {
  artist: Artist;
};

const ArtistSearchResult = ({ artist }: TProps) => {
  return (
    <SearchResult
      primaryText={<Link to={`/albums/${artist.id}`}>{artist.name}</Link>}
      secondaryText="Artist"
      imageUrl={`https://resources.tidal.com/images/${artist.picture?.replace(/-/g, "/")}/320x320.jpg`}
      linkUrl={`/albums/${artist.id}`}
    />
  );
};

export default ArtistSearchResult;
