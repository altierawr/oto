import { Link } from "react-router";
import type { Song } from "../../types";

type TProps = {
  song: Song;
};

const SongQueueItem = ({ song }: TProps) => {
  return (
    <div className="flex gap-3 hover:bg-(--gray-4) px-3 py-2 rounded-md -ml-3">
      <div
        className="h-[50px] aspect-square bg-cover rounded-lg"
        style={{
          backgroundImage: `url(https://resources.tidal.com/images/${song.album.cover.replace(/-/g, "/")}/80x80.jpg)`,
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
