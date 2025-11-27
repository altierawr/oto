import { Outlet, useLocation } from "react-router";
import Sidebar from "../components/sidebar";
import { useEffect, useState } from "react";
import { useLocationStore } from "../store";
import MusicControls from "../components/music-controls";
import AudioDebugger from "../components/debugger";

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
    <div className="h-dvh bg-(--gray-1) text-(--gray-12) relative">
      <AudioDebugger />

      <div className="w-full flex" style={{ height: "calc(100dvh - 100px)" }}>
        <Sidebar />
        <div className="flex-1 px-8 pt-8 overflow-y-auto flex justify-center">
          <Outlet />
        </div>
      </div>
      <MusicControls />
    </div>
  );
};

export default Root;
