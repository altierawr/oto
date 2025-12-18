import { Link } from "react-router";
import SearchResult from ".";
import type { Album } from "../../../types";

type TProps = {
  album: Album;
  onClose?: () => void;
};

const AlbumSearchResult = ({ album, onClose }: TProps) => {
  return (
    <SearchResult
      primaryText={
        <Link to={`/albums/${album.id}`} onClick={onClose}>
          {album.title}
        </Link>
      }
      secondaryText={
        <>
          <span className="capitalize">
            {album.type === "EP" ? album.type : album.type.toLowerCase()}
          </span>{" "}
          by{" "}
          <Link to={`/artists/${album.artists[0].id}`}>
            {album.artists[0].name}
          </Link>
        </>
      }
      imageUrl={`https://resources.tidal.com/images/${album.cover.replace(/-/g, "/")}/80x80.jpg`}
      linkUrl={`/albums/${album.id}`}
      onClose={onClose}
    />
  );
};

export default AlbumSearchResult;
