import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router";

const scrollPositions = new Map();

type TProps = {
  scrollRef: React.RefObject<HTMLElement | null>;
};

const ScrollReset = ({ scrollRef }: TProps) => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    if (navigationType === "POP") {
      // Back/forward navigation
      const savedPosition = scrollPositions.get(pathname);
      if (savedPosition !== undefined) {
        setTimeout(() => {
          scrollContainer.scrollTo(0, savedPosition);
        }, 0);
      }
    } else {
      // New navigation (PUSH or REPLACE)
      scrollContainer.scrollTo(0, 0);
    }

    return () => {
      scrollPositions.set(pathname, scrollContainer.scrollTop);
    };
  }, [pathname, navigationType, scrollRef]);

  return null;
};

export default ScrollReset;
