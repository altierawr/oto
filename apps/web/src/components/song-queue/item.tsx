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
          backgroundImage: `url(https://resources.tidal.com/images/${song.albumCover.replace(/-/g, "/")}/80x80.jpg)`,
        }}
      />

      <div className="flex flex-col justify-center">
        <p className="font-normal">{song.title}</p>
        <Link
          to={`/artists/${song.artistId}`}
          className="text-sm text-(--gray-11)"
        >
          {song.artistName}
        </Link>
      </div>
    </div>
  );
};

export default SongQueueItem;
