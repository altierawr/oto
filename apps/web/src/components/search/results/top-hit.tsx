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
  onClose?: () => void;
};

const TopHitSearchResult = ({ topHit, onClose }: TProps) => {
  return (
    <>
      {topHit.type === "ARTISTS" && (
        <ArtistSearchResult artist={topHit.value as Artist} onClose={onClose} />
      )}

      {topHit.type === "ALBUMS" && (
        <AlbumSearchResult album={topHit.value as Album} onClose={onClose} />
      )}

      {topHit.type === "TRACKS" && (
        <SongSearchResult song={topHit.value as Song} onClose={onClose} />
      )}

      {topHit.type === "PLAYLISTS" && (
        <PlaylistSearchResult
          playlist={topHit.value as Playlist}
          onClose={onClose}
        />
      )}
    </>
  );
};

export default TopHitSearchResult;
