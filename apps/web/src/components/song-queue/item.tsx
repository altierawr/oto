import { Link } from "react-router";
import type { Song } from "../../types";
import { getTidalCoverUrl } from "../../utils/image";

type TProps = {
  song: Song;
};

const SongQueueItem = ({ song }: TProps) => {
  return (
    <div className="flex gap-3 hover:bg-(--gray-4) px-3 py-2 rounded-md -ml-3">
      <div
        className="h-[50px] aspect-square bg-cover rounded-lg"
        style={{
          backgroundImage: `url(${
            song.album?.cover ? getTidalCoverUrl(song.album.cover, 80) : ""
          })`,
        }}
      />

      <div className="flex flex-col justify-center">
        <p className="font-normal">{song.title}</p>
        {song.artists.map((artist) => (
          <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
        ))}
      </div>
    </div>
  );
};

export default SongQueueItem;
