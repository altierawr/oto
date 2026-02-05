import { Link } from "react-router";

import type { Album } from "../../../types";

import SearchResult from ".";
import { getTidalCoverUrl } from "../../../utils/image";

type TProps = {
  album: Album;
  onClose?: () => void;
};

const AlbumSearchResult = ({ album, onClose }: TProps) => {
  return (
    <SearchResult
      primaryText={album.title}
      secondaryText={
        <>
          <span className="capitalize">{album.type === "EP" ? album.type : album.type?.toLowerCase() || "album"}</span>{" "}
          by {album.artists?.[0] && <Link to={`/artists/${album.artists[0].id}`}>{album.artists[0].name}</Link>}
        </>
      }
      imageUrl={album.cover ? getTidalCoverUrl(album.cover, 80) : ""}
      linkUrl={`/albums/${album.id}`}
      onClose={onClose}
    />
  );
};

export default AlbumSearchResult;
