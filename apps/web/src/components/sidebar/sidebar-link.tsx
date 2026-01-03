import type { ReactElement } from "react";
import { Link } from "react-router";
import clsx from "clsx";
import { type TLocation, useLocationStore } from "../../store";

type TProps = {
  icon: ReactElement;
  text: string;
  url: string;
  location: TLocation;
};

const SidebarLink = ({ icon, text, url, location: linkLocation }: TProps) => {
  const location = useLocationStore((state) => state.location);
  const setLocation = useLocationStore((state) => state.setLocation);

  const isActive = location === linkLocation;

  const handleLinkClick = () => {
    setLocation(linkLocation);
  };

  return (
    <Link to={url} onClick={handleLinkClick}>
      <div
        className={clsx(
          "flex items-center gap-2 p-2 rounded-md text-[14px] text-(--gray-11) border border-transparent",
          isActive && "text-(--gray-12) bg-(--gray-0) shadow font-medium",
        )}
      >
        {icon} {text}
      </div>
    </Link>
  );
};

export default SidebarLink;
