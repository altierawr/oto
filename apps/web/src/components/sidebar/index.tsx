import useCurrentUser, {
  invalidateUserQuery,
} from "../../hooks/useCurrentUser";
import { Facehash } from "facehash";
import { ChevronUp } from "lucide-react";
import { Menu } from "design";
import { request } from "../../utils/http";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import clsx from "clsx";

const Sidebar = () => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
    <div className="h-full lg:min-w-[220px] py-4 px-2 flex flex-col justify-between border-r border-r-(--gray-3)">
      <Link
        to="/"
        className="flex items-center px-1 lg:px-3 gap-3 no-underline! mx-auto lg:mx-0"
      >
        <img src={"/logo-64.png"} width="20" height="20" />
        <p className="font-medium text-2xl hidden lg:inline-block">oto</p>
      </Link>

      <div className="lg:w-full lg:*:w-full">
        {user && (
          <Menu.Root onOpenChange={(open) => setIsUserMenuOpen(open)}>
            <Menu.Trigger>
              <div className="flex items-center justify-between py-1 lg:py-2 px-1 lg:px-3 rounded-md transition-colors group hover:bg-(--gray-4) cursor-pointer">
                <div className="flex gap-2 items-center w-full">
                  <Facehash
                    className="rounded-md select-none"
                    name={user.username}
                    colors={["#264653", "#2a9d8f", "#e9c46a"]}
                    size={32}
                  />

                  <div className="overflow-hidden flex-1 items-center hidden lg:grid">
                    <p className="text-(--gray-12) text-sm max-w-[100px] truncate text-left">
                      {user.username}
                    </p>
                    <p className="text-(--gray-11) text-xs line-clamp-1 text-left">
                      {user.isAdmin ? "Admin user" : "Regular user"}
                    </p>
                  </div>

                  <ChevronUp
                    size={16}
                    className={clsx(
                      "text-(--gray-11) group-hover:text-(--gray-12) transition-[rotate,color] rotate-0 hidden lg:block",
                      isUserMenuOpen && "rotate-180",
                    )}
                  />
                </div>
              </div>
            </Menu.Trigger>
            <Menu.Content>
              <Menu.Item onClick={handleChangePassword}>
                Change password
              </Menu.Item>
              <Menu.Item onClick={handleLogOut}>Log out</Menu.Item>
            </Menu.Content>
          </Menu.Root>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
