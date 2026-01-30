import clsx from "clsx";
import { Button, IconButton, Spacer } from "design";
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
  const { ref, scrollLeft, scrollRight, canScrollLeft, canScrollRight } =
    useHorizontalScrollSnap({
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
        style={style}
      >
        {children}
      </div>
    </>
  );
};

export default HorizontalMediaScroller;
