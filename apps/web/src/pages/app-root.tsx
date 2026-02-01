import { Outlet, useLocation } from "react-router";
import Sidebar from "../components/sidebar";
import { useEffect, useRef, useState } from "react";
import { useLocationStore } from "../store";
import MusicControls from "../components/music-controls";
import AudioDebugger from "../components/debugger";
import SongQueue from "../components/song-queue";
import Navbar from "../components/navbar";
import useScrollRestoration from "../hooks/useScrollRestoration";

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
      <div className="h-dvh bg-(--gray-0) text-(--gray-12) relative">
        <div className="w-full flex" style={{ height: "calc(100dvh - 100px)" }}>
          <Sidebar />

          <div className="relative w-full h-full min-w-0 flex justify-center">
            <div className="relative w-full h-full max-w-[1800px]">
              <div
                className="absolute w-full inset-0 pointer-events-none z-1 grid"
                style={{
                  gridTemplateColumns:
                    "[breakout-start] var(--space-10) [content-start] 1fr [content-end] var(--space-10) [breakout-end]",
                }}
              >
                <div
                  className="col-[breakout-start/content-start] h-full"
                  style={{
                    background:
                      "linear-gradient(to left, rgba(0,0,0,0.0), rgba(0,0,0,0.9) 60%, rgba(0,0,0,1.0) 100%)",
                  }}
                />
                <div
                  className="col-[content-end/breakout-end] h-full"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(0,0,0,0.0), rgba(0,0,0,0.9) 60%, rgba(0,0,0,1.0) 100%)",
                  }}
                />
              </div>

              <main
                ref={scrollRef}
                className="w-full h-full overflow-y-auto grid *:col-[content] items-start content-start auto-rows-max"
                style={{
                  gridTemplateColumns:
                    "[breakout-start] var(--space-10) [content-start] 1fr [content-end] var(--space-10) [breakout-end]",
                }}
              >
                <Navbar />
                <Outlet />
              </main>
            </div>
          </div>
        </div>

        <MusicControls />
        <AudioDebugger />
        <SongQueue />
      </div>
    </>
  );
};

export default AppRoot;
