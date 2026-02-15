import { Spacer } from "@awlt/design";
import clsx from "clsx";
import { Fragment } from "react/jsx-runtime";

import type { Song } from "../../types";

import styles from "./album-track-list.module.css";
import AlbumTrackListItem from "./item";

type TProps = {
  songs: Song[];
};

const AlbumTrackList = ({ songs }: TProps) => {
  return (
    <div className={clsx("grid", styles.albumTrackList)}>
      <div className="rounded-md bg-(--gray-2) py-4 font-semibold max-sm:hidden!">
        <div className="text-center text-xs">#</div>
        <div className="overflow-hidden text-xs text-nowrap text-ellipsis uppercase">Title</div>
        <div className="text-xs uppercase">Duration</div>
        <div className=""></div>
      </div>

      <Spacer size="1" />

      {songs.map((song, idx) => (
        <Fragment key={song.id}>
          <AlbumTrackListItem song={song} songs={songs} />
          {idx < songs.length - 1 && <div className="my-1 h-px w-full bg-(--gray-2)" />}
        </Fragment>
      ))}
    </div>
  );
};

export default AlbumTrackList;
