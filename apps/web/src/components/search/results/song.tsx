import { Link } from "react-router";
import SearchResult from ".";
import type { Song } from "../../../types";
import { Fragment } from "react/jsx-runtime";

type TProps = {
  song: Song;
  onClose?: () => void;
};

const SongSearchResult = ({ song, onClose }: TProps) => {
  return (
    <SearchResult
      primaryText={
        <Link to={`/albums/${song.album.id}`} onClick={onClose}>
          {song.title}
        </Link>
      }
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
      imageUrl={`https://resources.tidal.com/images/${song.album.cover.replace(/-/g, "/")}/80x80.jpg`}
      linkUrl={`/albums/${song.album.id}`}
      onClose={onClose}
    />
  );
};

export default SongSearchResult;
