import { Spacer } from "@awlt/design";
import { useEffect, useRef } from "react";

import { useGeneralStore, usePlayerState } from "../../store";
import { CoverBlockVariant } from "../music-blocks/cover-block";
import SongQueueItem from "./item";

const SongQueue = () => {
  const { playerState } = usePlayerState();
  const generalState = useGeneralStore();
  const isVisible = useGeneralStore((store) => store.isSongQueueVisible);

  const nowPlayingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isVisible) {
      nowPlayingRef.current?.scrollIntoView({
        behavior: "instant",
      });
    }
  }, [isVisible]);

  const handleBlur = () => {
    console.log("blur");
    generalState.setIsSongQueueVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-40 h-dvh w-dvw bg-[rgba(0,0,0,0.3)] transition-opacity"
      style={{
        pointerEvents: isVisible ? "unset" : "none",
        opacity: isVisible ? "1" : "0",
      }}
      onClick={handleBlur}
    >
      <div
        className="fixed top-0 right-0 max-w-[450px] min-w-[450px] p-4"
        style={{
          height: "calc(100dvh - 100px)",
          transform: isVisible ? "translate(0, 0)" : "translate(0, 5px)",
          transition: "transform 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isVisible}
        <div className="grid h-full w-full content-start rounded-md border border-(--gray-6) bg-(--gray-2)">
          <div className="p-5">
            <h2 className="text-lg font-black tracking-wide text-(--gray-12)">Queue</h2>
          </div>

          <div className="grid flex-1 content-start overflow-y-auto px-5">
            {playerState.playlist.length === 0 && <p>Queue empty</p>}

            {playerState.playlistIndex !== null && (
              <>
                {playerState.playlistIndex > 0 && (
                  <>
                    <h3 className="font-semibold">Previous tracks</h3>
                    {playerState.playlist.slice(0, playerState.playlistIndex).map((pe, index) => (
                      <SongQueueItem key={pe.id} song={pe} index={index} />
                    ))}
                    <div className="min-h-5" />
                  </>
                )}

                <h3 ref={nowPlayingRef} className="font-semibold">
                  Now playing
                </h3>
                <SongQueueItem
                  song={playerState.playlist[playerState.playlistIndex]}
                  index={playerState.playlistIndex}
                  coverBlockVariant={CoverBlockVariant.COVER_ONLY}
                />

                <Spacer size="5" />

                {playerState.playlist.length > playerState.playlistIndex + 1 && (
                  <>
                    <h3 className="font-semibold">Next up</h3>
                    {playerState.playlist
                      .slice(playerState.playlistIndex + 1, playerState.playlist.length)
                      .map((pe, index) => (
                        <SongQueueItem key={pe.id} song={pe} index={playerState.playlistIndex! + 1 + index} />
                      ))}
                  </>
                )}

                <Spacer size="4" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongQueue;
