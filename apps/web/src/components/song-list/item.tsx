import { Link } from "react-router";
import type { Song } from "../../types";
import { formatDuration } from "../../utils/utils";
import {
  IconDots,
  IconHeart,
  IconPlayerPlay,
  IconPlus,
} from "@tabler/icons-react";
import { usePlayerState } from "../../store";
import { Heart, ListPlus, MoreHorizontal, Plus } from "lucide-react";

type TProps = {
  song: Song;
  songs: Song[];
};

const SongListItem = ({ song, songs }: TProps) => {
  const player = usePlayerState((s) => s.player);

  const handleClick = async () => {
    player.playSongs(songs, song.trackNumber - 1);
  };

  return (
    <div
      className="rounded-md py-2 hover:bg-(--gray-2) active:bg-(--gray-3) group text-sm"
      onDoubleClick={handleClick}
    >
      <div
        className="text-center shrink-0 basis-[24px] cursor-pointer"
        onClick={handleClick}
      >
        <span className="group-hover:hidden">{song.trackNumber}</span>
        <IconPlayerPlay
          className="hidden group-hover:block"
          size={20}
          fill="currentColor"
        />
      </div>
      <div className="overflow-hidden text-ellipsis text-nowrap cursor-default select-none tracking-tight">
        <p className="">{song.title}</p>
        {song.artists.map((artist, index) => (
          <span key={artist.id} className="text-(--gray-11)">
            <Link to={`/artists/${artist.id}`} className="text-(--gray-11)!">
              {artist.name}
            </Link>
            {index < song.artists.length - 1 && ", "}
          </span>
        ))}
      </div>
      <div className="cursor-default select-none">
        {formatDuration(song.duration, "digital")}
      </div>
      <div className="flex items-center justify-end h-full">
        <div className="h-full aspect-square grid place-items-center cursor-pointer hover:bg-(--gray-4) rounded-full">
          <MoreHorizontal
            size={20}
            strokeWidth={1.5}
            className="opacity-0 group-hover:opacity-100"
          />
        </div>
        <div className="h-full aspect-square grid place-items-center cursor-pointer hover:bg-(--gray-4) rounded-full">
          {/* The left margin is to help visually center the icon (it's not symmetrical) */}
          <ListPlus
            size={18}
            strokeWidth={1.5}
            className="opacity-0 group-hover:opacity-100 ml-[3px]"
          />
        </div>
        <div className="h-full aspect-square grid place-items-center cursor-pointer hover:bg-(--gray-4) rounded-full">
          <Heart size={18} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
};

export default SongListItem;
