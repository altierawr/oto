import { Button, IconButton, Spacer } from "@awlt/design";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type HTMLAttributes, type PropsWithChildren } from "react";
import { useNavigate } from "react-router";

import useHorizontalScrollSnap from "../../hooks/useHorizontalScrollSnap";

type TClassNameProps = {
  id: string;
  title: string;
  viewAllUrl?: string;
  className?: string;
  style?: HTMLAttributes<HTMLDivElement>["style"];
};

const HorizontalMediaScroller = ({
  id,
  title,
  viewAllUrl,
  children,
  className,
  style,
}: PropsWithChildren<TClassNameProps>) => {
  const navigate = useNavigate();
  const { ref, scrollLeft, scrollRight, canScrollLeft, canScrollRight } = useHorizontalScrollSnap({
    id,
    gap: 20,
    scrollAmount: 5,
  });

  const handleViewAllClick = () => {
    if (viewAllUrl) {
      navigate(viewAllUrl);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <div
          className="items-center gap-2"
          style={{
            display: ref.current && ref.current.scrollWidth <= ref.current.clientWidth ? "none" : "flex",
          }}
        >
          <IconButton
            variant="soft"
            color="gray"
            icon={ChevronLeft}
            size="xs"
            isDisabled={!canScrollLeft}
            onClick={scrollLeft}
          />
          <IconButton
            variant="soft"
            color="gray"
            icon={ChevronRight}
            size="xs"
            isDisabled={!canScrollRight}
            onClick={scrollRight}
          />
          <Button variant="soft" color="gray" size="xs" onClick={handleViewAllClick}>
            View All
          </Button>
        </div>
      </div>

      <Spacer size="2" />

      <div
        ref={ref}
        className={clsx(
          className,
          "no-scrollbar grid snap-x snap-mandatory auto-cols-[160px] grid-flow-col items-stretch gap-5 overflow-x-auto overscroll-x-contain pb-2",
        )}
        style={style}
      >
        {children}
      </div>
    </>
  );
};

export default HorizontalMediaScroller;
