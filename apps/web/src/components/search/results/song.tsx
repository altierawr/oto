import { Link } from "react-router";
import SearchResult from ".";
import type { Song } from "../../../types";
import { getTidalCoverUrl } from "../../../utils/image";
import { Fragment } from "react/jsx-runtime";
import { CoverBlockVariant } from "../../music-blocks/cover-block";
import { usePlayerState } from "../../../store";

type TProps = {
  song: Song;
  onClose?: () => void;
};

const SongSearchResult = ({ song, onClose }: TProps) => {
  const { player, playInfo } = usePlayerState();
  const isPlaying = playInfo?.song.id === song.id;

  const handlePlayClick = () => {
    if (isPlaying) {
      player.togglePlayPause();
    } else {
      player.playSongs([song], 0);
    }
  };

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
      coverBlockVariant={CoverBlockVariant.PLAY_ONLY}
      isPlaying={isPlaying}
      onPlayClick={handlePlayClick}
      onClose={onClose}
    />
  );
};

export default SongSearchResult;
