import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router";

const scrollPositions = new Map();

export enum ScrollDimension {
  VERTICAL,
  HORIZONTAL,
}

type TProps = {
  scrollRef: React.RefObject<HTMLElement | null>;
  id?: string;
  dimension?: ScrollDimension;
};

const useScrollRestoration = ({
  scrollRef,
  id,
  dimension = ScrollDimension.VERTICAL,
}: TProps) => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const key = pathname + (id || "");
  const currentKeyRef = useRef(key);

  // Continuously track scroll position
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const scrollProperty =
      dimension === ScrollDimension.HORIZONTAL ? "scrollLeft" : "scrollTop";

    const handleScroll = () => {
      scrollPositions.set(
        currentKeyRef.current,
        scrollContainer[scrollProperty],
      );
    };

    scrollContainer.addEventListener("scrollend", handleScroll, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener("scrollend", handleScroll);
    };
  }, [scrollRef, dimension]);

  // Handle scroll restoration on navigation
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const scrollProperty =
      dimension === ScrollDimension.HORIZONTAL ? "scrollLeft" : "scrollTop";

    if (navigationType === "POP") {
      // Back/forward navigation - restore position
      const savedPosition = scrollPositions.get(key);
      if (savedPosition !== undefined) {
        scrollContainer[scrollProperty] = savedPosition;
      }
    } else {
      // New navigation - scroll to start
      scrollContainer[scrollProperty] = 0;
    }

    currentKeyRef.current = key;
  }, [key, navigationType, scrollRef, dimension]);
};

export default useScrollRestoration;
