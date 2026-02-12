import { Menu } from "@awlt/design";
import { IconSettings } from "@tabler/icons-react";
import clsx from "clsx";
import { Facehash } from "facehash";
import { ChevronsUpDown, LogOutIcon } from "lucide-react";
import { Link, useNavigate } from "react-router";

import logo from "../../assets/oto-logo.svg";
import useCurrentUser, { invalidateUserQuery } from "../../hooks/useCurrentUser";
import { request } from "../../utils/http";

const Sidebar = () => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();

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
    <div className="h-full pr-0 lg:p-3">
      <div className="hidden h-full flex-col justify-between rounded-xl border-r border-r-(--gray-3) bg-(--gray-2) px-2 pt-4 pb-2 shadow-2xl md:flex lg:min-w-[220px]">
        <Link to="/" className="mx-auto flex items-center gap-3 px-1 no-underline! lg:mx-0 lg:px-3">
          <img src={logo} width="20" height="20" />
          <p className="hidden text-2xl font-medium lg:inline-block">oto</p>
        </Link>

        <div className="lg:w-full lg:*:w-full">
          {user && (
            <Menu.Root>
              <Menu.Trigger>
                <div className="group flex cursor-pointer items-center justify-between rounded-xl px-1 py-1 transition-colors hover:bg-(--gray-4) lg:px-3 lg:py-2">
                  <div className="flex w-full items-center gap-2">
                    <Facehash
                      className="rounded-md select-none"
                      name={user.username}
                      colors={["#264653", "#2a9d8f", "#e9c46a"]}
                      size={32}
                    />

                    <div className="hidden flex-1 items-center overflow-hidden lg:grid">
                      <p className="max-w-[100px] truncate text-left text-sm text-(--gray-12)">{user.username}</p>
                      <p className="line-clamp-1 text-left text-xs text-(--gray-11)">
                        {user.isAdmin ? "Admin user" : "Regular user"}
                      </p>
                    </div>

                    <ChevronsUpDown
                      size={16}
                      className={clsx(
                        "hidden text-(--gray-11) transition-[rotate,color] group-hover:text-(--gray-12) lg:block",
                      )}
                    />
                  </div>
                </div>
              </Menu.Trigger>
              <Menu.Popup side="top" className="w-(--anchor-width)">
                <Menu.Item onClick={handleChangePassword}>
                  <IconSettings />
                  Account settings
                </Menu.Item>
                <Menu.Item onClick={handleLogOut}>
                  <LogOutIcon />
                  Log out
                </Menu.Item>
              </Menu.Popup>
            </Menu.Root>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
