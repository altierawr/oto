import { useEffect, useRef, useState } from "react";
import useScrollRestoration, { ScrollDimension } from "./useScrollRestoration";
import { useLocation } from "react-router";

enum ScrollDirection {
  LEFT,
  RIGHT,
}

type TProps = {
  id: string;
  gap?: number;
  scrollAmount?: number;
  isLoading?: boolean;
};

const useHorizontalScrollSnap = ({
  id,
  gap = 20,
  scrollAmount = 5,
  isLoading,
}: TProps) => {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [_, forceUpdate] = useState(0);
  const [latestScrollPos, setLatestScrollPos] = useState<number | undefined>(
    ref.current ? ref.current.scrollLeft : undefined,
  );

  useScrollRestoration({
    scrollRef: ref,
    id,
    dimension: ScrollDimension.HORIZONTAL,
  });

  useEffect(() => {
    // After loading wait for render
    setTimeout(() => {
      forceUpdate((n) => n + 1);
    });
  }, [isLoading]);

  const tryToScroll = (direction: ScrollDirection, amount: number = 1) => {
    if (latestScrollPos === undefined || !ref.current || isLoading) {
      return;
    }

    const isLeft = direction === ScrollDirection.LEFT;
    const isRight = direction === ScrollDirection.RIGHT;

    let idx = scrollIndex;
    let scrollPos = latestScrollPos;

    for (let i = 0; i < amount; i++) {
      if (
        (isLeft && scrollPos <= 0) ||
        (isRight &&
          ref.current.scrollWidth - ref.current.clientWidth - scrollPos <= 1)
      ) {
        break;
      }

      const itemScrollWidth = ref.current.children[0].clientWidth;
      scrollPos = Math.max(
        0,
        scrollPos + (isRight ? 1 : -1) * (itemScrollWidth + gap),
      );

      idx += direction === ScrollDirection.LEFT ? -1 : 1;
    }

    if (idx !== scrollIndex) {
      ref.current.scrollTo({
        left: scrollPos,
        behavior: "smooth",
      });

      setLatestScrollPos(scrollPos);
      setScrollIndex(idx);
    }
  };

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (latestScrollPos === undefined) {
      if (ref.current.children.length > 0) {
        const items = ref.current.children;

        for (let i = 0; i < items.length; i++) {
          const item = items[i] as HTMLDivElement;
          const itemScrollWidth = item.clientWidth;
          const itemScrollLeft = i * (itemScrollWidth + gap);

          if (
            ref.current.scrollLeft === itemScrollLeft ||
            (i > 0 &&
              ref.current.scrollLeft > (i - 1) * (itemScrollWidth + gap) &&
              ref.current.scrollLeft < itemScrollLeft)
          ) {
            setLatestScrollPos(itemScrollLeft);
            setScrollIndex(i);
            return;
          }
        }

        const i = ref.current.children.length - 1;
        const itemScrollWidth = ref.current.children[0].clientWidth;
        setLatestScrollPos(i * (itemScrollWidth + gap));
        setScrollIndex(i);
      } else {
        setLatestScrollPos(0);
      }
    }

    const listener = (e: WheelEvent) => {
      if (
        !ref.current ||
        ref.current.children.length === 0 ||
        latestScrollPos === undefined
      ) {
        return;
      }

      if (e.shiftKey) {
        e.preventDefault();

        tryToScroll(
          e.deltaY > 0 ? ScrollDirection.RIGHT : ScrollDirection.LEFT,
        );
      }
    };

    const current = ref.current;
    current.addEventListener("wheel", listener);

    return () => {
      current.removeEventListener("wheel", listener);
    };
  }, [
    ref,
    scrollIndex,
    latestScrollPos,
    gap,
    pathname,
    isLoading,
    // oxlint-disable-next-line eslint-plugin-react-hooks(exhaustive-deps)
    tryToScroll,
  ]);

  const scrollLeft = () => {
    tryToScroll(ScrollDirection.LEFT, scrollAmount);
  };

  const scrollRight = () => {
    tryToScroll(ScrollDirection.RIGHT, scrollAmount);
  };

  const canScrollLeft = isLoading
    ? false
    : latestScrollPos !== undefined && latestScrollPos > 0;
  const canScrollRight =
    !isLoading && ref.current
      ? ref.current.scrollWidth -
          ref.current.clientWidth -
          (latestScrollPos || 0) >
        1
      : false;

  return {
    ref,
    scrollLeft,
    scrollRight,
    canScrollLeft,
    canScrollRight,
    scrollIndex,
  };
};

export default useHorizontalScrollSnap;
