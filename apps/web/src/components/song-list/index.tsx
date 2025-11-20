import type { Song } from "../../types";
import SongListItem from "./item";

type TProps = {
  songs: Song[];
};

const SongList = ({ songs }: TProps) => {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="w-full flex items-center gap-2 px-4 font-semibold">
        <div className="text-center shrink-0 basis-[24px]">#</div>
        <div className="grow basis-[300px] overflow-hidden text-ellipsis text-nowrap">
          Title
        </div>
        <div className="grow shrink basis-[200px] overflow-hidden text-ellipsis text-nowrap">
          Artist
        </div>
        <div className="shrink-0 basis-[72px]">Duration</div>
        <div className="flex gap-2 items-center shrink-0 basis-[100px] opacity-0"></div>
      </div>

      <div className="flex flex-col">
        {songs.map((song, i) => (
          <SongListItem key={song.id} song={song} songs={songs} index={i} />
        ))}
      </div>
    </div>
  );
};

export default SongList;
