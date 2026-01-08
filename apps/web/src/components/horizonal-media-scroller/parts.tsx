import clsx from "clsx";
import { Button, IconButton, Spacer } from "design";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type PropsWithChildren } from "react";
import { Link, useNavigate } from "react-router";
import useHorizontalScrollSnap from "../../hooks/useHorizontalScrollSnap";

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
  const navigate = useNavigate();
  const { ref, scrollLeft, scrollRight, canScrollLeft, canScrollRight } =
    useHorizontalScrollSnap({
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
