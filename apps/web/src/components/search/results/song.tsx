import { Link } from "react-router";
import { Fragment } from "react/jsx-runtime";

import type { Song } from "../../../types";

import SearchResult from ".";
import { usePlayerState } from "../../../store";
import { getTidalCoverUrl } from "../../../utils/image";
import { CoverBlockVariant } from "../../music-blocks/cover-block";

type TProps = {
  song: Song;
  onClose?: () => void;
};

const SongSearchResult = ({ song, onClose }: TProps) => {
  const { player, song: playerSong } = usePlayerState();
  const isPlaying = playerSong?.id === song.id;

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
      linkUrl={song.album?.id ? `/albums/${song.album.id}?track=${song.id}` : undefined}
      coverBlockVariant={CoverBlockVariant.PLAY_ONLY}
      isPlaying={isPlaying}
      onPlayClick={handlePlayClick}
      onClose={onClose}
    />
  );
};

export default SongSearchResult;
