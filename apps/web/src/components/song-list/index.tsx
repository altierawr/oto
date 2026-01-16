import clsx from "clsx";
import type { Song } from "../../types";
import SongListItem from "./item";
import styles from "./song-list.module.css";
import { Spacer } from "design";
import { Fragment } from "react/jsx-runtime";

type TProps = {
  songs: Song[];
};

const SongList = ({ songs }: TProps) => {
  return (
    <div className={clsx("grid", styles.songList)}>
      <div className="py-4 rounded-md font-semibold bg-(--gray-1)">
        <div className="text-center text-xs">#</div>
        <div className="overflow-hidden text-ellipsis text-nowrap uppercase text-xs">
          Title
        </div>
        <div className="text-xs uppercase">Duration</div>
        <div className=""></div>
      </div>

      <Spacer size="1" />

      {songs.map((song, idx) => (
        <Fragment key={song.id}>
          <SongListItem song={song} songs={songs} />
          {idx < songs.length - 1 && (
            <div className="w-full h-px bg-(--gray-2) my-1" />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default SongList;
