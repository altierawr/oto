import { Link } from "react-router";
import SearchResult from ".";
import type { Song } from "../../../types";
import { getTidalCoverUrl } from "../../../utils/image";
import { Fragment } from "react/jsx-runtime";

type TProps = {
  song: Song;
  onClose?: () => void;
};

const SongSearchResult = ({ song, onClose }: TProps) => {
  return (
    <SearchResult
      primaryText={song.title}
      secondaryText={
        <>
          Song by{" "}
          {song.artists.map((artist, index) => (
            <Fragment key={artist.id}>
              <Link to={`/artists/${artist.id}`} onClick={onClose}>
                {artist.name}
              </Link>
              {index < song.artists.length - 2 && ", "}
              {index === song.artists.length - 2 && " & "}
            </Fragment>
          ))}
        </>
      }
      imageUrl={song.album?.cover ? getTidalCoverUrl(song.album.cover, 80) : ""}
      linkUrl={
        song.album?.id ? `/albums/${song.album.id}?track=${song.id}` : undefined
      }
      onClose={onClose}
    />
  );
};

export default SongSearchResult;
