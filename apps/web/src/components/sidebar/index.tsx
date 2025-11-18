import { IconHome, IconUser, IconAlbum } from "@tabler/icons-react";
import SidebarLink from "./sidebar-link";

const Sidebar = () => {
  return (
    <div className="h-full w-[250px] border-r border-gray-5 bg-gray-2 pt-8 px-2">
      <SidebarLink
        icon={<IconHome stroke={1.5} />}
        text="Home"
        url="/"
        location="home"
      />
      <SidebarLink
        icon={<IconUser stroke={1.5} />}
        text="Artists"
        url="/artists"
        location="artists"
      />
      <SidebarLink
        icon={<IconAlbum stroke={1.5} />}
        text="Albums"
        url="/albums"
        location="albums"
      />
    </div>
  );
};

export default Sidebar;
