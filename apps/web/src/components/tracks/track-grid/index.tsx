import { Skeleton } from "@awlt/design";
import { IconChevronCompactLeft, IconChevronCompactRight } from "@tabler/icons-react";
import clsx from "clsx";

import type { Song } from "../../../types";

import useHorizontalScrollSnap from "../../../hooks/useHorizontalScrollSnap";
import TrackGridItem from "./item";

type TProps = {
  tracks: Song[];
  className?: string;
  isLoading?: boolean;
  expectedNrMaxItems?: number;
};

const TrackGrid = ({ tracks, className, isLoading, expectedNrMaxItems = 50 }: TProps) => {
  const { ref, scrollLeft, scrollRight, canScrollLeft, canScrollRight } = useHorizontalScrollSnap({
    id: "artistTopTracks",
    gap: 20,
    scrollAmount: 1,
    isLoading,
  });

  return (
    <div className={clsx("relative overflow-x-hidden", className)}>
      <div
        className={clsx(
          "absolute top-1/2 left-0 z-1 hidden h-full w-(--content-side-padding) -translate-y-1/2 items-center justify-center lg:flex",
          isLoading && "hidden",
        )}
        onClick={scrollLeft}
        style={{
          background:
            "linear-gradient(to left, rgba(0,0,0,0.0), color-mix(in srgb, var(--gray-1) 90%, transparent) 60%, var(--gray-1) 100%)",
        }}
      >
        <div
          className={clsx(
            "rounded-md py-5 transition-colors hover:bg-(--gray-3)",
            (!canScrollLeft || isLoading) && "hidden",
          )}
          onClick={scrollLeft}
        >
          <IconChevronCompactLeft size={24} />
        </div>
      </div>
      <div
        className={clsx(
          "absolute top-1/2 right-0 z-1 hidden h-full w-(--content-side-padding) -translate-y-1/2 items-center justify-center lg:flex",
          isLoading && "hidden",
        )}
        style={{
          background:
            "linear-gradient(to right, rgba(0,0,0,0.0), color-mix(in srgb, var(--gray-1) 90%, transparent) 60%, var(--gray-1) 100%)",
        }}
      >
        <div
          className={clsx(
            "rounded-md py-5 transition-colors hover:bg-(--gray-3)",
            (!canScrollRight || isLoading) && "hidden",
          )}
          onClick={scrollRight}
        >
          <IconChevronCompactRight size={24} />
        </div>
      </div>
      <div
        ref={ref}
        className="no-scrollbar grid w-full snap-x snap-mandatory scroll-px-(--content-side-padding) auto-cols-[320px] grid-flow-col grid-rows-[58px_58px_58px] content-start items-start gap-x-5 overflow-x-auto overscroll-x-contain px-(--content-side-padding)"
      >
        {tracks.map((track, idx) => (
          <TrackGridItem key={track.id} track={track} tracks={tracks} trackIndex={idx} isLoading={isLoading} />
        ))}

        {isLoading &&
          [...Array(expectedNrMaxItems - tracks.length)].map((_, idx) => (
            <div
              key={idx}
              className={clsx(
                "flex snap-start gap-3 border-t border-(--gray-3) py-2",
                (idx + 1 + tracks.length) % 3 === 0 && "border-b",
              )}
            >
              <div className="aspect-square h-[40px] overflow-hidden rounded-md bg-(--gray-1)">
                <Skeleton />
              </div>
              <div className="h-[40px] flex-1 overflow-hidden rounded-md bg-(--gray-1)">
                <Skeleton />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default TrackGrid;
