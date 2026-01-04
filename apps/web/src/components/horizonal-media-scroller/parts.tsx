import clsx from "clsx";
import { Button, IconButton, Spacer } from "design";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Link, useNavigate } from "react-router";

enum ScrollDirection {
  LEFT,
  RIGHT,
}

type TClassNameProps = {
  title: string;
  viewAllUrl?: string;
  className?: string;
};

const Root = ({
  title,
  viewAllUrl,
  children,
  className,
}: PropsWithChildren<TClassNameProps>) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [latestScrollPos, setLatestScrollPos] = useState<number | undefined>(
    ref.current?.scrollLeft,
  );
  const navigate = useNavigate();

  const tryToScroll = (direction: ScrollDirection, amount: number = 1) => {
    if (latestScrollPos === undefined || !ref.current) {
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

      scrollPos = Math.max(
        0,
        scrollPos +
        (isRight ? 1 : -1) * (ref.current.children[0].clientWidth + 20),
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

        tryToScroll(
          e.deltaY > 0 ? ScrollDirection.RIGHT : ScrollDirection.LEFT,
        );
      }
    };

    ref.current.addEventListener("wheel", listener);

    return () => {
      ref.current?.removeEventListener("wheel", listener);
    };
  }, [ref, scrollIndex, latestScrollPos]);

  const handlePrevClick = () => {
    tryToScroll(ScrollDirection.LEFT, 5);
  };

  const handleNextClick = () => {
    tryToScroll(ScrollDirection.RIGHT, 5);
  };

  const handleViewAllClick = () => {
    if (viewAllUrl) {
      navigate(viewAllUrl);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-2xl">{title}</h2>
        <div
          className="gap-2 items-center"
          style={{
            display:
              ref.current && ref.current.scrollWidth <= ref.current.clientWidth
                ? "none"
                : "flex",
          }}
        >
          <IconButton
            variant="soft"
            color="gray"
            icon={ChevronLeft}
            size="xs"
            onClick={handlePrevClick}
          />
          <IconButton
            variant="soft"
            color="gray"
            icon={ChevronRight}
            size="xs"
            onClick={handleNextClick}
          />
          <Button
            variant="soft"
            color="gray"
            size="xs"
            onClick={handleViewAllClick}
          >
            View All
          </Button>
        </div>
      </div>

      <Spacer size="2" />

      <div
        ref={ref}
        className={clsx(
          className,
          "grid grid-flow-col auto-cols-[145px] gap-5 pb-2 overscroll-x-contain no-scrollbar overflow-x-auto snap-x snap-mandatory items-stretch",
        )}
      >
        {children}
      </div>
    </>
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
  linkUrl: string;
};

const Image = ({ url, linkUrl }: TImageProps) => {
  return (
    <div className="w-full aspect-square rounded-md cursor-pointer hover:p-0.5 transition-all">
      <Link to={linkUrl}>
        <img className="w-full h-full object-cover rounded-md" src={url} />
      </Link>
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
