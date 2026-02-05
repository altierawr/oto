import { Spacer } from "@awlt/design";
import clsx from "clsx";
import { Fragment } from "react/jsx-runtime";

import type { Song } from "../../types";

import SongListItem from "./item";
import styles from "./song-list.module.css";

type TProps = {
  songs: Song[];
};

const SongList = ({ songs }: TProps) => {
  return (
    <div className={clsx("grid", styles.songList)}>
      <div className="rounded-md bg-(--gray-1) py-4 font-semibold">
        <div className="text-center text-xs">#</div>
        <div className="overflow-hidden text-xs text-nowrap text-ellipsis uppercase">Title</div>
        <div className="text-xs uppercase">Duration</div>
        <div className=""></div>
      </div>

      <Spacer size="1" />

      {songs.map((song, idx) => (
        <Fragment key={song.id}>
          <SongListItem song={song} songs={songs} />
          {idx < songs.length - 1 && <div className="my-1 h-px w-full bg-(--gray-2)" />}
        </Fragment>
      ))}
    </div>
  );
};

export default SongList;
