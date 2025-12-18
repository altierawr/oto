import type {
  Album,
  Artist,
  Playlist,
  SearchResults,
  Song,
} from "../../../types";
import ArtistSearchResult from "./artist";
import AlbumSearchResult from "./album";
import SongSearchResult from "./song";
import PlaylistSearchResult from "./playlist";

type TProps = {
  topHit: SearchResults["topHits"][number];
};

const TopHitSearchResult = ({ topHit }: TProps) => {
  return (
    <>
      {topHit.type === "ARTISTS" && (
        <ArtistSearchResult artist={topHit.value as Artist} />
      )}

      {topHit.type === "ALBUMS" && (
        <AlbumSearchResult album={topHit.value as Album} />
      )}

      {topHit.type === "TRACKS" && (
        <SongSearchResult song={topHit.value as Song} />
      )}

      {topHit.type === "PLAYLISTS" && (
        <PlaylistSearchResult playlist={topHit.value as Playlist} />
      )}
    </>
  );
};

export default TopHitSearchResult;
