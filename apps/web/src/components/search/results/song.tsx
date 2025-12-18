import { Link } from "react-router";
import SearchResult from ".";
import type { Song } from "../../../types";
import { Fragment } from "react/jsx-runtime";

type TProps = {
  song: Song;
};

const SongSearchResult = ({ song }: TProps) => {
  return (
    <SearchResult
      primaryText={<Link to={`/albums/${song.album.id}`}>{song.title}</Link>}
      secondaryText={
        <>
          Song by{" "}
          {song.artists.map((artist, index) => (
            <Fragment key={artist.id}>
              <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
              {index < song.artists.length - 2 && ", "}
              {index === song.artists.length - 2 && " & "}
            </Fragment>
          ))}
        </>
      }
      imageUrl={`https://resources.tidal.com/images/${song.album.cover.replace(/-/g, "/")}/80x80.jpg`}
      linkUrl={`/albums/${song.album.id}`}
    />
  );
};

export default SongSearchResult;
