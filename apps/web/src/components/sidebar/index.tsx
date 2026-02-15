import { Menu, Sidebar as AwltSidebar } from "@awlt/design";
import { Facehash } from "facehash";
import {
  AlbumIcon,
  ChevronsUpDownIcon,
  LibraryIcon,
  LogOutIcon,
  MusicIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";

import logo from "../../assets/oto-logo.svg";
import useCurrentUser, { invalidateUserQuery } from "../../hooks/useCurrentUser";
import { request } from "../../utils/http";

const Sidebar = () => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleChangePassword = () => {
    navigate("/account");
  };

  const handleLogOut = async () => {
    const resp = await request("/users/logout", {
      method: "POST",
      skipRedirect: true,
    });

    invalidateUserQuery();

    if (resp.ok) {
      navigate("/login");
      return;
    }

    const data = await resp.json();
    console.error("Something went wrong with logout, status:", resp.status);
    console.log({ data });

    navigate("/login");
  };

  return (
    <div className="h-full pr-0 sm:p-3">
      <AwltSidebar.Root
        className="w-[220px] rounded-xl border-r border-r-(--gray-3) bg-(--gray-2) shadow-2xl max-sm:hidden!"
        isAutoCollapsible
        isManualCollapsible
      >
        <AwltSidebar.Header>
          <AwltSidebar.HeaderLogo className="gap-1!">
            <AwltSidebar.HeaderLogoSquareImage
              className="data-[is-auto-collapsed='true']:pointer-events-auto! data-[is-collapsed='false']:cursor-pointer data-[is-collapsed='true']:pointer-events-none data-[is-collapsed='true']:cursor-pointer!"
              onClick={() => navigate("/")}
            >
              <img src={logo} className="h-[20px]! w-[20px]!" />
            </AwltSidebar.HeaderLogoSquareImage>
            <span>Oto</span>
          </AwltSidebar.HeaderLogo>
        </AwltSidebar.Header>
        <AwltSidebar.Content>
          <AwltSidebar.Group>
            <AwltSidebar.GroupHeader>
              <AwltSidebar.GroupTitle>Your content</AwltSidebar.GroupTitle>
            </AwltSidebar.GroupHeader>

            <AwltSidebar.List>
              <AwltSidebar.Item tooltip="Library">
                <AwltSidebar.ItemButton isActive={pathname === "/library"} onClick={() => navigate("/library")}>
                  <LibraryIcon />
                  <span>Library</span>
                </AwltSidebar.ItemButton>
              </AwltSidebar.Item>
              <AwltSidebar.Item tooltip="Artists">
                <AwltSidebar.ItemButton
                  isActive={pathname === "/library/artists"}
                  onClick={() => navigate("/library/artists")}
                >
                  <UserIcon />
                  <span>Artists</span>
                </AwltSidebar.ItemButton>
              </AwltSidebar.Item>
              <AwltSidebar.Item tooltip="Albums">
                <AwltSidebar.ItemButton
                  isActive={pathname === "/library/albums"}
                  onClick={() => navigate("/library/albums")}
                >
                  <AlbumIcon />
                  <span>Albums</span>
                </AwltSidebar.ItemButton>
              </AwltSidebar.Item>
              <AwltSidebar.Item tooltip="Tracks">
                <AwltSidebar.ItemButton
                  isActive={pathname === "/library/tracks"}
                  onClick={() => navigate("/library/tracks")}
                >
                  <MusicIcon />
                  <span>Tracks</span>
                </AwltSidebar.ItemButton>
              </AwltSidebar.Item>
            </AwltSidebar.List>
          </AwltSidebar.Group>
        </AwltSidebar.Content>

        {user && (
          <AwltSidebar.Footer>
            <AwltSidebar.Item tooltip="Account">
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <AwltSidebar.ItemButton className="data-[is-collapsed='true']:p-1! data-[is-collapsed='true']:[&_span]:opacity-100!">
                      <div className="flex w-full items-center gap-2">
                        <Facehash
                          className="min-h-[32px] min-w-[32px] rounded-lg select-none **:[svg]:text-(--gray-0)!"
                          name={user.username}
                          colors={["#264653", "#2a9d8f", "#e9c46a"]}
                          size={32}
                        />

                        <div className="grid flex-1 items-center overflow-hidden">
                          <p className="max-w-[100px] truncate text-left text-sm text-(--gray-12)">{user.username}</p>
                          <p className="line-clamp-1 text-left text-xs text-(--gray-11)">
                            {user.isAdmin ? "Admin user" : "Regular user"}
                          </p>
                        </div>

                        <ChevronsUpDownIcon
                          size={16}
                          className="text-(--gray-11) transition-[rotate,color] group-hover:text-(--gray-12)"
                        />
                      </div>
                    </AwltSidebar.ItemButton>
                  }
                />
                <Menu.Popup side="top" className="w-(--anchor-width) min-w-[200px]">
                  <Menu.Item onClick={handleChangePassword}>
                    <SettingsIcon />
                    Account settings
                  </Menu.Item>
                  <Menu.Item onClick={handleLogOut}>
                    <LogOutIcon />
                    Log out
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Root>
            </AwltSidebar.Item>
          </AwltSidebar.Footer>
        )}
      </AwltSidebar.Root>
    </div>
  );
};

export default Sidebar;
