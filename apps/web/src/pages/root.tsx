import { Outlet, useLocation } from "react-router";
import Sidebar from "../components/sidebar";
import { useEffect, useState } from "react";
import { useLocationStore } from "../store";
import MusicControls from "../components/music-controls";
import AudioDebugger from "../components/debugger";
import SongQueue from "../components/song-queue";
import Navbar from "../components/navbar";

const Root = () => {
  const location = useLocation();
  const setLocation = useLocationStore((state) => state.setLocation);
  const [hasSetInitialLocation, setHasSetInitialLocation] = useState(false);

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
    <div className="h-dvh bg-(--gray-0) text-(--gray-12) relative">
      <div className="w-full flex" style={{ height: "calc(100dvh - 100px)" }}>
        <Sidebar />
        <div className="flex-1 px-8 overflow-y-auto flex flex-col items-center">
          <Navbar />
          <Outlet />
        </div>
      </div>

      <MusicControls />
      <AudioDebugger />
      <SongQueue />
    </div>
  );
};

export default Root;
