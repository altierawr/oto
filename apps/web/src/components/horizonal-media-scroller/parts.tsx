import clsx from "clsx";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";

type TClassNameProps = {
  className?: string;
};

const Root = ({ children, className }: PropsWithChildren<TClassNameProps>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [latestScrollPos, setLatestScrollPos] = useState<number | undefined>(
    ref.current?.scrollLeft,
  );

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (latestScrollPos === undefined) {
      if (ref.current.children.length > 0) {
        const items = ref.current.children;

        for (let i = 0; i < items.length; i++) {
          const item = items[i] as HTMLDivElement;

          const itemScrollLeft = i * (item.clientWidth + 20);
          if (
            ref.current.scrollLeft === itemScrollLeft ||
            (i > 0 &&
              ref.current.scrollLeft > (i - 1) * (item.clientWidth + 20) &&
              ref.current.scrollLeft < itemScrollLeft)
          ) {
            setLatestScrollPos(itemScrollLeft);
            setScrollIndex(i);
            return;
          }
        }

        const i = ref.current.children.length - 1;

        setLatestScrollPos(i * (ref.current.children[0].clientWidth + 20));
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

        // We are fully scrolled
        if (
          (e.deltaY < 0 && latestScrollPos <= 0) ||
          (e.deltaY > 0 &&
            ref.current.scrollWidth -
            ref.current.clientWidth -
            latestScrollPos <=
            1)
        ) {
          return;
        }

        let i = scrollIndex + (e.deltaY > 0 ? 1 : -1);

        const scrollPos = Math.max(
          0,
          latestScrollPos +
          (e.deltaY > 0 ? 1 : -1) *
          (ref.current.children[0].clientWidth + 20),
        );

        ref.current.scrollTo({
          left: scrollPos,
          behavior: "smooth",
        });

        setLatestScrollPos(scrollPos);
        setScrollIndex(i);
      }
    };

    ref.current.addEventListener("wheel", listener);

    return () => {
      ref.current?.removeEventListener("wheel", listener);
    };
  }, [ref, scrollIndex, latestScrollPos]);

  return (
    <div
      ref={ref}
      className={clsx(
        className,
        "grid grid-flow-col auto-cols-[145px] gap-5 pb-2 overscroll-x-contain no-scrollbar overflow-x-auto snap-x snap-mandatory items-stretch",
      )}
    >
      {children}
    </div>
  );
};

const Item = ({ children }: PropsWithChildren) => {
  return (
    <div className="grid grid-rows-[min-content] snap-start content-start">
      {children}
    </div>
  );
};

type TImageProps = {
  url: string;
  onClick?: () => void;
};

const Image = ({ url, onClick }: TImageProps) => {
  return (
    <div
      className="w-full aspect-square rounded-md cursor-pointer hover:p-0.5 transition-all"
      onClick={onClick}
    >
      <img className="w-full h-full object-cover rounded-md" src={url} />
    </div>
  );
};

const Title = ({ children }: PropsWithChildren) => {
  return (
    <p className="text-(--gray-12) text-sm line-clamp-2 mt-2">{children}</p>
  );
};

const Subtitle = ({ children }: PropsWithChildren) => {
  return <p className="text-(--gray-11) text-xs line-clamp-2">{children}</p>;
};

export { Root, Item, Image, Title, Subtitle };
