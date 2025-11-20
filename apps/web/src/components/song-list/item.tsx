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

type TProps = {
  song: Song;
  songs: Song[];
  index: number;
};

const SongListItem = ({ song, songs, index }: TProps) => {
  const player = usePlayerState((s) => s.player);

  const handleClick = async () => {
    player.playSongs(songs, index);
  };

  return (
    <div className="w-full flex items-center gap-2 h-7 rounded-lg py-6 px-4 hover:bg-gray-3 group">
      <div className="text-center shrink-0 basis-[24px]" onClick={handleClick}>
        <span className="group-hover:hidden">{song.trackNumber}</span>
        <IconPlayerPlay
          className="hidden group-hover:block"
          size={20}
          stroke={1.5}
        />
      </div>
      <div className="grow basis-[300px] overflow-hidden text-ellipsis text-nowrap cursor-default select-none tracking-tight">
        {song.title}
      </div>
      <div className="grow shrink basis-[200px] overflow-hidden text-ellipsis text-nowrap cursor-default select-none tracking-tight">
        <Link to={`/artists/${song.artistId}`}>{song.artistName}</Link>
      </div>
      <div className="shrink-0 basis-[72px] cursor-default select-none">
        {formatDuration(song.duration)}
      </div>
      <div className="flex gap-2 items-center shrink-0 basis-[100px]">
        <IconDots size={20} stroke={1.5} />
        <IconPlus size={20} stroke={1.5} />
        <IconHeart size={20} stroke={1.5} />
      </div>
    </div>
  );
};

export default SongListItem;
