import { useEffect, useState } from "react";

const useHasTouch = () => {
  const [hasTouch, setHasTouch] = useState(
    () => window.matchMedia("(pointer: coarse)").matches, // initial check (skip if SSR)
  );

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const handler = (e: MediaQueryListEvent) => setHasTouch(e.matches);

    mq.addEventListener("change", handler);
    return () => {
      mq.removeEventListener("change", handler);
    };
  }, []);

  return hasTouch;
};

export default useHasTouch;
