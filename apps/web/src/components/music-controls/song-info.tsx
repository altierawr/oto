import clsx from "clsx";
import { Link } from "react-router";

import { usePlayerState } from "../../store";
import { getTidalCoverUrl } from "../../utils/image";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";

const MusicControlsSongInfo = () => {
  const { song } = usePlayerState();

  return (
    <div className="flex h-full items-center gap-2 md:gap-3">
      <>
        <div className="aspect-square h-full">
          {song?.album && (
            <CoverBlock
              variant={CoverBlockVariant.COVER_ONLY}
              imageUrl={getTidalCoverUrl(song.album.cover, 320)}
              linkUrl={`/albums/${song.album.id}`}
            />
          )}

          {!song?.album && <div className="h-full w-full rounded-md bg-(--gray-6)" />}
        </div>

        <div className="flex flex-col justify-center">
          <p
            className={clsx("line-clamp-1 text-sm md:line-clamp-2", song && "font-medium", !song && "text-(--gray-11)")}
          >
            {song?.album && <Link to={`/albums/${song.album.id}?track=${song.id}`}>{song.title}</Link>}
            {!song?.album && song && song.title}
            {!song && "No track"}
          </p>
          <p className="line-clamp-1 text-xs text-(--gray-11)">
            {song?.artists.map((artist, index) => (
              <span key={artist.id}>
                <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
                {index < song.artists.length - 1 && ", "}
              </span>
            ))}
          </p>
        </div>
      </>
    </div>
  );
};

export default MusicControlsSongInfo;
