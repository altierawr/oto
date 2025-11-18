import { Outlet, useLocation } from "react-router";
import Sidebar from "../components/sidebar";
import { useEffect, useState } from "react";
import { useLocationStore } from "../store";

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
    <div className="w-full flex h-[100dvh]">
      <Sidebar />
      <div className="flex-1 px-8 pt-8">
        <Outlet />
      </div>
    </div>
  );
};

export default Root;
