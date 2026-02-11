import clsx from "clsx";
import { useEffect, useState, type RefObject } from "react";

import Search from "../search";

type TProps = {
  scrollRef: RefObject<HTMLElement | null>;
};

const Navbar = ({ scrollRef }: TProps) => {
  const [isAtTop, setIsAtTop] = useState(scrollRef.current ? scrollRef.current.scrollTop === 0 : true);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    const current = scrollRef.current;
    let lastScrollTop = current.scrollTop;

    const scrollListener = () => {
      if (current.scrollTop > lastScrollTop) {
        setIsAtTop(current.scrollTop === 0);
      }

      lastScrollTop = current.scrollTop;
    };

    const scrollEndListener = () => {
      setIsAtTop(current.scrollTop === 0);
    };

    const wheelListener = (e: WheelEvent) => {
      if (e.shiftKey) {
        return;
      }

      const canScroll = current.scrollHeight - current.clientHeight - (current.scrollTop || 0) > 1;

      if (canScroll) {
        setIsAtTop(current.scrollTop + e.deltaY <= 0);
      }
    };

    current.addEventListener("wheel", wheelListener);
    current.addEventListener("scrollend", scrollEndListener);
    current.addEventListener("scroll", scrollListener);

    return () => {
      current.removeEventListener("wheel", wheelListener);
      current.removeEventListener("scrollend", scrollEndListener);
      current.removeEventListener("scroll", scrollListener);
    };
  }, [scrollRef, setIsAtTop]);

  return (
    <div className="sticky top-0 z-30 col-[breakout]! flex w-full px-5">
      <div
        className={clsx(
          "flex w-full rounded-full bg-transparent px-5 py-4 ring ring-transparent backdrop-blur-xl transition-[translate,background-color,box-shadow]",
          !isAtTop && "translate-y-3 bg-[color-mix(in_srgb,var(--gray-1)_90%,transparent)]! shadow-md ring-(--gray-3)!",
        )}
      >
        <Search />
      </div>
    </div>
  );
};

export default Navbar;
