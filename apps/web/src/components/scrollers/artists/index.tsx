import { Skeleton } from "@awlt/design";
import clsx from "clsx";

import type { Artist } from "../../../types";

import HorizontalMediaScroller from "../../horizonal-media-scroller";
import ArtistsScrollerItem from "./item";

type TProps = {
  id: string;
  title: string;
  viewAllUrl: string;
  artists: Artist[];
  isLoading?: boolean;
};

const SKELETON_ITEMS = 8;

const ArtistsScroller = ({ id, title, viewAllUrl, artists, isLoading }: TProps) => {
  return (
    <>
      <HorizontalMediaScroller
        id={id}
        key={isLoading ? 1 : 0}
        title={title}
        viewAllUrl={viewAllUrl}
        isLoading={isLoading}
        className={clsx("col-[breakout]! scroll-px-(--content-side-padding) px-(--content-side-padding)")}
      >
        {isLoading &&
          [...Array(SKELETON_ITEMS)].map((_, idx) => (
            <div key={idx} className="snap-start">
              <div className="aspect-square w-full overflow-hidden rounded-full bg-(--gray-2)">
                <Skeleton />
              </div>
              <div className="mx-auto mt-2 h-[20px] w-3/4 overflow-hidden rounded-md bg-(--gray-2)">
                <Skeleton />
              </div>
            </div>
          ))}

        {!isLoading && artists.length === 0 && (
          <div aria-hidden className="invisible">
            <div className="aspect-square w-full overflow-hidden" />
            <div className="mx-auto mt-2 h-[20px] w-3/4" />
          </div>
        )}

        {!isLoading && artists.map((artist) => <ArtistsScrollerItem key={artist.id} artist={artist} />)}
      </HorizontalMediaScroller>
    </>
  );
};

export default ArtistsScroller;
