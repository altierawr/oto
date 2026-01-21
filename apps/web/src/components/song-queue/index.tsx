import { useEffect, useRef } from "react";
import { useGeneralStore, usePlayerState } from "../../store";
import SongQueueItem from "./item";
import { Spacer } from "design";
import { CoverBlockVariant } from "../music-blocks/cover-block";

const SongQueue = () => {
  const playerState = usePlayerState();
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
      className="fixed inset-0 w-dvw bg-[rgba(0,0,0,0.3)] z-50 transition-opacity"
      style={{
        pointerEvents: isVisible ? "unset" : "none",
        opacity: isVisible ? "1" : "0",
        height: "calc(100dvh - 100px)",
      }}
      onClick={handleBlur}
    >
      <div
        className="fixed right-0 top-0 min-w-[300px] p-4"
        style={{
          height: "calc(100dvh - 100px)",
          transform: isVisible ? "translate(0, 0)" : "translate(0, 5px)",
          transition: "transform 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isVisible}
        <div className="w-full h-full bg-(--gray-2) rounded-md grid border border-(--gray-6)">
          <div className="p-5">
            <h2 className="text-(--gray-12) text-lg font-black tracking-wide">
              Queue
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto grid px-5">
            {playerState.player.playlist.length === 0 && <p>Queue empty</p>}

            {playerState.playInfo?.playlistIndex !== undefined && (
              <>
                {playerState.playInfo.playlistIndex > 0 && (
                  <>
                    <h3 className="font-semibold">Previous tracks</h3>
                    {playerState.player.playlist
                      .slice(0, playerState.playInfo.playlistIndex)
                      .map((pe, index) => (
                        <SongQueueItem
                          key={pe.song.id}
                          song={pe.song}
                          index={index}
                        />
                      ))}
                    <div className="min-h-5" />
                  </>
                )}

                <h3 ref={nowPlayingRef} className="font-semibold">
                  Now playing
                </h3>
                <SongQueueItem
                  key={
                    playerState.player.playlist[
                      playerState.playInfo.playlistIndex
                    ].song.id
                  }
                  song={
                    playerState.player.playlist[
                      playerState.playInfo.playlistIndex
                    ].song
                  }
                  index={playerState.playInfo.playlistIndex}
                  coverBlockVariant={CoverBlockVariant.COVER_ONLY}
                />

                <Spacer size="5" />

                {playerState.player.playlist.length >
                  playerState.playInfo.playlistIndex + 1 && (
                  <>
                    <h3 className="font-semibold">Next up</h3>
                    {playerState.player.playlist
                      .slice(
                        playerState.playInfo.playlistIndex + 1,
                        playerState.player.playlist.length,
                      )
                      .map((pe, index) => (
                        <SongQueueItem
                          key={pe.song.id}
                          song={pe.song}
                          index={
                            playerState.playInfo!.playlistIndex + 1 + index
                          }
                        />
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
