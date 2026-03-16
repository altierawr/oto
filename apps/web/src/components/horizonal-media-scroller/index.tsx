import { Button, IconButton, Spacer } from "@awlt/design";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type HTMLAttributes, type PropsWithChildren } from "react";
import { useNavigate } from "react-router";

import useHorizontalScrollSnap from "../../hooks/useHorizontalScrollSnap";

type TClassNameProps = {
  id: string;
  title: React.ReactNode | string;
  viewAllUrl?: string;
  className?: string;
  isLoading?: boolean;
  titleContentGap?: React.ComponentProps<typeof Spacer>["size"];
  style?: HTMLAttributes<HTMLDivElement>["style"];
};

const HorizontalMediaScroller = ({
  id,
  title,
  viewAllUrl,
  children,
  className,
  isLoading,
  titleContentGap = "2",
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
      <div className="flex items-center justify-between gap-4">
        {typeof title === "string" && <h2 className="text-2xl font-semibold">{title}</h2>}
        {typeof title !== "string" && title}
        <div
          className={clsx(
            "flex items-center gap-2",
            (isLoading || (ref.current && ref.current.scrollWidth <= ref.current.clientWidth)) && "hidden",
          )}
        >
          <IconButton variant="soft" color="gray" size="xs" isDisabled={!canScrollLeft} onClick={scrollLeft}>
            <ChevronLeft />
          </IconButton>
          <IconButton variant="soft" color="gray" size="xs" isDisabled={!canScrollRight} onClick={scrollRight}>
            <ChevronRight />
          </IconButton>
          {viewAllUrl !== undefined && (
            <Button variant="soft" color="gray" size="xs" onClick={handleViewAllClick}>
              View All
            </Button>
          )}
        </div>
      </div>

      <Spacer size={titleContentGap} />

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
