import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router";

import AudioDebugger from "../components/debugger";
import MusicControls from "../components/music-controls";
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import SongQueue from "../components/song-queue";
import useScrollRestoration from "../hooks/useScrollRestoration";
import { useLocationStore } from "../store";

const AppRoot = () => {
  const location = useLocation();
  const setLocation = useLocationStore((state) => state.setLocation);
  const [hasSetInitialLocation, setHasSetInitialLocation] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  useScrollRestoration({
    scrollRef,
  });

  useEffect(() => {
    if (hasSetInitialLocation) {
      return;
    }

    setHasSetInitialLocation(true);

    switch (location.pathname) {
      case "/artists":
        setLocation("artists");
        break;
      case "/albums":
        setLocation("albums");
        break;
      default:
        setLocation("home");
    }
  }, [hasSetInitialLocation, location.pathname, setLocation]);

  return (
    <>
      <div className="relative h-dvh bg-(--gray-1) text-(--gray-12)">
        <div className="flex h-full w-full">
          <Sidebar />

          <div className="relative flex h-full w-full min-w-0 justify-center">
            <div className="relative h-full w-full max-w-[1800px]">
              <div
                className="pointer-events-none absolute inset-0 z-1 grid w-full"
                style={{
                  gridTemplateColumns:
                    "[breakout-start] var(--space-10) [content-start] 1fr [content-end] var(--space-10) [breakout-end]",
                }}
              >
                <div
                  className="col-[breakout-start/content-start] h-full"
                  style={{
                    background:
                      "linear-gradient(to left, rgba(0,0,0,0.0), color-mix(in srgb, var(--gray-1) 90%, transparent) 60%, var(--gray-1) 100%)",
                  }}
                />
                <div
                  className="col-[content-end/breakout-end] h-full"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(0,0,0,0.0),color-mix(in srgb, var(--gray-1) 90%, transparent) 60%, var(--gray-1) 100%)",
                  }}
                />
              </div>

              <main
                ref={scrollRef}
                className="grid h-full w-full grid-rows-[1fr_auto] content-start items-start overflow-y-auto *:col-[content]"
                style={{
                  gridTemplateColumns:
                    "[breakout-start] var(--space-10) [content-start] 1fr [content-end] var(--space-10) [breakout-end]",
                }}
              >
                <div className="col-[breakout]! grid grid-cols-subgrid *:col-[content]">
                  <Navbar scrollRef={scrollRef} />
                  <Outlet />
                </div>
                <MusicControls />
              </main>
            </div>
          </div>
        </div>

        <AudioDebugger />
        <SongQueue />
      </div>
    </>
  );
};

export default AppRoot;
