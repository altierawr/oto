import { Spacer } from "@awlt/design";
import clsx from "clsx";
import { Fragment } from "react/jsx-runtime";

import type { Song } from "../../types";

import MixedTrackListItem from "./item";
import styles from "./mixed-track-list.module.css";

type TProps = {
  tracks: Song[];
};

const MixedTrackList = ({ tracks }: TProps) => {
  return (
    <div className={clsx("grid", styles.mixedTrackList)}>
      <div className="rounded-md bg-(--gray-2) py-4 font-semibold max-sm:hidden!">
        <div className="text-center text-xs">#</div>
        <div className=""></div>
        <div className="overflow-hidden text-xs text-nowrap text-ellipsis uppercase">Title</div>
        <div className="overflow-hidden text-xs text-nowrap text-ellipsis uppercase">Album</div>
        <div className="text-xs uppercase">Duration</div>
        <div className=""></div>
      </div>

      <Spacer size="1" />

      {tracks.map((track, idx) => (
        <Fragment key={track.id}>
          <MixedTrackListItem song={track} songs={tracks} trackIndex={idx} />
          {idx < tracks.length - 1 && <div className="my-1 h-px w-full bg-(--gray-2)" />}
        </Fragment>
      ))}
    </div>
  );
};

export default MixedTrackList;
