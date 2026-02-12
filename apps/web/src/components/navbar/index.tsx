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

    const scrollListener = (e: Event) => {
      if (e.target !== current) {
        return;
      }

      if (current.scrollTop > lastScrollTop) {
        setIsAtTop(current.scrollTop === 0);
      }

      lastScrollTop = current.scrollTop;
    };

    const scrollEndListener = (e: Event) => {
      if (e.target !== current) {
        return;
      }

      setIsAtTop(current.scrollTop === 0);
    };

    const wheelListener = (e: WheelEvent) => {
      if (e.shiftKey || e.target !== current) {
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
    <div className="sticky top-0 z-30 col-[breakout]! flex w-full lg:px-5">
      <div
        className={clsx(
          "flex h-(--navbar-height) w-full items-center bg-transparent px-(--content-side-padding) ring ring-transparent backdrop-blur-none transition-[translate,background-color,box-shadow,backdrop-filter] lg:rounded-full lg:px-5",
          !isAtTop &&
            "bg-[color-mix(in_srgb,var(--gray-1)_50%,transparent)]! backdrop-blur-xl lg:translate-y-3 lg:bg-[color-mix(in_srgb,var(--gray-1)_90%,transparent)]! lg:shadow-md lg:ring-(--gray-3)!",
        )}
      >
        <Search />
      </div>
    </div>
  );
};

export default Navbar;
