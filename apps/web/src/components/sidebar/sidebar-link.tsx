import type { ReactElement } from "react";

import clsx from "clsx";
import { Link } from "react-router";

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
          "flex items-center gap-2 rounded-md border border-transparent p-2 text-[14px] text-(--gray-11)",
          isActive && "bg-(--gray-0) font-medium text-(--gray-12) shadow",
        )}
      >
        {icon} {text}
      </div>
    </Link>
  );
};

export default SidebarLink;
