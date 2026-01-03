import { IconHome, IconUser, IconAlbum } from "@tabler/icons-react";
import SidebarLink from "./sidebar-link";

const Sidebar = () => {
  return (
    <div className="h-full w-[220px] pt-8 px-2 sticky">
      <SidebarLink
        icon={<IconHome size={20} stroke={1.5} />}
        text="Home"
        url="/"
        location="home"
      />
      <SidebarLink
        icon={<IconUser size={20} stroke={1.5} />}
        text="Artists"
        url="/artists"
        location="artists"
      />
      <SidebarLink
        icon={<IconAlbum size={20} stroke={1.5} />}
        text="Albums"
        url="/albums"
        location="albums"
      />
    </div>
  );
};

export default Sidebar;
