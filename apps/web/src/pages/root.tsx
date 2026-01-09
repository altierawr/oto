import { Outlet, useLocation } from "react-router";
import Sidebar from "../components/sidebar";
import { useEffect, useRef, useState } from "react";
import { useLocationStore } from "../store";
import MusicControls from "../components/music-controls";
import AudioDebugger from "../components/debugger";
import SongQueue from "../components/song-queue";
import Navbar from "../components/navbar";
import useScrollRestoration from "../hooks/useScrollRestoration";

const Root = () => {
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
          <main
            ref={scrollRef}
            className="flex-1 overflow-y-auto grid *:col-[content] items-start content-start auto-rows-max"
            style={{
              gridTemplateColumns:
                "[breakout-start] var(--spacing-8) [content-start] 1fr [content-end] var(--spacing-8) [breakout-end]",
            }}
          >
            <Navbar />
            <Outlet />
          </main>
        </div>

        <MusicControls />
        <AudioDebugger />
        <SongQueue />
      </div>
    </>
  );
};

export default Root;
