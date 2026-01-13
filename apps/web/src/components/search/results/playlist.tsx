import { Fragment } from "react/jsx-runtime";
import { Link } from "react-router";
import SearchResult from ".";
import type { Playlist } from "../../../types";

type TProps = {
  playlist: Playlist;
  onClose?: () => void;
};

const PlaylistSearchResult = ({ playlist, onClose }: TProps) => {
  return (
    <SearchResult
      primaryText={playlist.title}
      secondaryText={
        <>
          {playlist.promotedArtists.length === 0 && "Playlist"}
          {playlist.promotedArtists.length > 0 && (
            <>
              Playlist featuring{" "}
              {playlist.promotedArtists.map((artist, index) => (
                <Fragment key={artist.id}>
                  <Link to={`/artists/${artist.id}`} onClick={onClose}>
                    {artist.name}
                  </Link>
                  {index < playlist.promotedArtists.length - 2 && ", "}
                  {index === playlist.promotedArtists.length - 2 && " & "}
                </Fragment>
              ))}
            </>
          )}
        </>
      }
      imageUrl={`https://resources.tidal.com/images/${playlist.squareImage?.replace(/-/g, "/")}/320x320.jpg`}
      linkUrl={`/playlists/${playlist.uuid}`}
      onClose={onClose}
    />
  );
};

export default PlaylistSearchResult;
