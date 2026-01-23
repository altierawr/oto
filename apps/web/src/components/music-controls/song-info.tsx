import { Link } from "react-router";
import { usePlayerState } from "../../store";
import { getTidalCoverUrl } from "../../utils/image";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";

const MusicControlsSongInfo = () => {
  const { song } = usePlayerState();

  return (
    <div className="h-full flex gap-3 items-center">
      {song && (
        <>
          {song.album && (
            <div className="h-full aspect-square">
              <CoverBlock
                variant={CoverBlockVariant.COVER_ONLY}
                imageUrl={getTidalCoverUrl(song.album.cover, 320)}
                linkUrl={`/albums/${song.album.id}`}
              />
            </div>
          )}

          <div className="flex flex-col justify-center">
            <p className="font-bold text-sm line-clamp-2">
              {song.album && (
                <Link to={`/albums/${song.album.id}?track=${song.id}`}>
                  {song.title}
                </Link>
              )}
              {!song.album && song.title}
            </p>
            <p className="text-xs text-gray-11">
              {song?.artists.map((artist, index) => (
                <span key={artist.id}>
                  <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
                  {index < song.artists.length - 1 && ", "}
                </span>
              ))}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default MusicControlsSongInfo;
