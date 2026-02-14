import { Skeleton } from "@awlt/design";
import clsx from "clsx";

import type { Album } from "../../../types";

import HorizontalMediaScroller from "../../horizonal-media-scroller";
import AlbumsScrollerItem from "./item";

type TProps = {
  id: string;
  title: string;
  viewAllUrl: string;
  albums: Album[];
  showArtists?: boolean;
  showDate?: boolean;
  isLoading?: boolean;
};

const NR_SKELETON_ITEMS = 8;

const AlbumsScroller = ({ id, title, viewAllUrl, albums, showArtists = true, showDate, isLoading }: TProps) => {
  const textSkeletonCount = 1 + (showArtists ? 1 : 0) + (showDate ? 1 : 0);

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
          [...Array(NR_SKELETON_ITEMS)].map((_, idx) => (
            <div key={idx} className="grid snap-start grid-rows-[min-content] content-start">
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-(--gray-2)">
                <Skeleton />
              </div>

              {[...Array(textSkeletonCount)].map((__, textIdx) => (
                <div
                  key={textIdx}
                  className={clsx(
                    "overflow-hidden rounded-md bg-(--gray-2)",
                    textIdx === 0 ? "mt-2 h-[20px]" : "mt-1 h-[16px]",
                    textIdx === 0 ? "w-full" : "w-3/4",
                  )}
                >
                  <Skeleton />
                </div>
              ))}
            </div>
          ))}

        {!isLoading && albums.length === 0 && (
          <div aria-hidden className="invisible grid snap-start grid-rows-[min-content] content-start">
            <div className="aspect-square w-full overflow-hidden rounded-xl" />
            {[...Array(textSkeletonCount)].map((_, idx) => (
              <div key={idx} className={clsx(idx === 0 ? "mt-2 h-[20px] w-full" : "mt-1 h-[16px] w-3/4")} />
            ))}
          </div>
        )}

        {!isLoading &&
          albums.map((album) => (
            <AlbumsScrollerItem key={album.id} album={album} showArtists={showArtists} showDate={showDate} />
          ))}
      </HorizontalMediaScroller>
    </>
  );
};

export default AlbumsScroller;
