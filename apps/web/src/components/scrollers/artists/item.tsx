import type { Artist } from "../../../types";

import ArtistBlock from "../../music-blocks/artist-block";

type TProps = {
  artist: Artist;
};

const ArtistsScrollerItem = ({ artist }: TProps) => {
  return <ArtistBlock key={artist.id} artist={artist} />;
};

export default ArtistsScrollerItem;
