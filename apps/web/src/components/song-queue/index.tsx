import { useEffect, useRef } from "react";
import { useGeneralStore, usePlayerState } from "../../store";
import SongQueueItem from "./item";

const SongQueue = () => {
  const playerState = usePlayerState();
  const isVisible = useGeneralStore((store) => store.isSongQueueVisible);

  const nowPlayingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (isVisible) {
      nowPlayingRef.current?.scrollIntoView({
        behavior: "instant",
      });
    }
  }, [isVisible]);

  return (
    <div
      className="fixed right-0 top-0 min-w-[300px] p-4"
      style={{
        height: "calc(100dvh - 100px)",
        pointerEvents: isVisible ? "unset" : "none",
        opacity: isVisible ? "1" : "0",
        transform: isVisible ? "translate(0, 0)" : "translate(0, 5px)",
        transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
      }}
    >
      {isVisible}
      <div className="w-full h-full bg-(--gray-2) rounded-md flex flex-col border border-(--gray-6)">
        <div className="p-5">
          <h2 className="text-(--gray-12) text-lg font-black tracking-wide">
            Queue
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col px-5">
          {playerState.player.playlist.length === 0 && <p>Queue empty</p>}

          {playerState.playInfo?.playlistIndex !== undefined && (
            <>
              {playerState.playInfo.playlistIndex > 0 && (
                <>
                  <h3 className="font-semibold">Previous tracks</h3>
                  {playerState.player.playlist
                    .slice(0, playerState.playInfo.playlistIndex)
                    .map((pe) => (
                      <SongQueueItem key={pe.song.id} song={pe.song} />
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
              />

              <div className="min-h-5" />

              {playerState.player.playlist.length >
                playerState.playInfo.playlistIndex + 1 && (
                  <>
                    <h3 className="font-semibold">Next up</h3>
                    {playerState.player.playlist
                      .slice(
                        playerState.playInfo.playlistIndex + 1,
                        playerState.player.playlist.length,
                      )
                      .map((pe) => (
                        <SongQueueItem key={pe.song.id} song={pe.song} />
                      ))}
                  </>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongQueue;
