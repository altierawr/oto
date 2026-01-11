import clsx from "clsx";
import type { Song } from "../../types";
import { Link } from "react-router";
import useHorizontalScrollSnap from "../../hooks/useHorizontalScrollSnap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "design";
import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";
import { usePlayerState } from "../../store";

type TProps = {
  tracks: Song[];
  isLoading?: boolean;
  expectedNrMaxItems?: number;
};

const TrackGrid = ({ tracks, isLoading, expectedNrMaxItems = 50 }: TProps) => {
  const player = usePlayerState((s) => s.player);
  const { ref, scrollLeft, scrollRight, canScrollLeft, canScrollRight } =
    useHorizontalScrollSnap({
      id: "artistTopTracks",
      gap: 20,
      scrollAmount: 1,
    });

  return (
    <div className="relative overflow-x-hidden pl-10">
      <div
        className={clsx(
          "absolute left-0 top-1/2 -translate-y-1/2 grid place-content-center rounded-md px-1 py-5 hover:bg-(--gray-3) transition-colors",
          (!canScrollLeft || isLoading) && "hidden",
        )}
        onClick={scrollLeft}
      >
        <ChevronLeft size={20} />
      </div>
      <div
        className={clsx(
          "absolute right-0 top-1/2 -translate-y-1/2 grid place-content-center w-8 h-full bg-[rgba(0,0,0,0.0)] backdrop-blur-sm",
          isLoading && "hidden",
        )}
        onClick={scrollRight}
      >
        <div
          className={clsx(
            "rounded-md px-1 py-5 hover:bg-(--gray-3) transition-colors",
            (!canScrollRight || isLoading) && "hidden",
          )}
        >
          <ChevronRight size={20} />
        </div>
      </div>
      <div
        ref={ref}
        className="grid grid-flow-col auto-cols-[320px] grid-rows-[58px_58px_58px] gap-x-5 w-full overscroll-x-contain no-scrollbar overflow-x-auto snap-x snap-mandatory items-start content-start"
      >
        {tracks.map((track, idx) => (
          <div
            key={track.id}
            className={clsx(
              "flex gap-3 items-center border-t border-(--gray-3) py-2 snap-start",
              ((idx + 1) % 3 === 0 ||
                (idx === tracks.length - 1 && !isLoading)) &&
              "border-b",
            )}
          >
            <div className="h-[40px] aspect-square">
              <CoverBlock
                variant={CoverBlockVariant.PLAY_ONLY}
                imageUrl={`https://resources.tidal.com/images/${track.album.cover.replace(/-/g, "/")}/80x80.jpg`}
                onPlayClick={() => player.playSongs(tracks, idx)}
              />
            </div>

            <div className="flex-1">
              <p className="font-normal line-clamp-1 text-sm">
                <Link to={`/albums/${track.album.id}`}>{track.title}</Link>
              </p>
              <p className="text-xs text-(--gray-11) line-clamp-1">
                {track.artists.map((artist, index) => (
                  <span key={artist.id}>
                    <Link to={`/artists/${artist.id}`}>{artist.name}</Link>
                    {index < track.artists.length - 1 && ", "}
                  </span>
                ))}
              </p>
            </div>
          </div>
        ))}

        {isLoading &&
          [...Array(expectedNrMaxItems - tracks.length)].map((_, idx) => (
            <div
              key={idx}
              className={clsx(
                "flex gap-3 py-2 border-t border-(--gray-3) snap-start",
                (idx + 1 + tracks.length) % 3 === 0 && "border-b",
              )}
            >
              <div className="bg-(--gray-1) h-[40px] aspect-square rounded-md overflow-hidden">
                <Skeleton />
              </div>
              <div className="bg-(--gray-1) h-[40px] flex-1 rounded-md overflow-hidden">
                <Skeleton />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default TrackGrid;
