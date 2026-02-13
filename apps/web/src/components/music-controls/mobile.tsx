import { Button as BaseButton } from "@base-ui/react";
import clsx from "clsx";
import { MusicIcon, LibraryIcon, SearchIcon } from "lucide-react";
import { useRef, useState, type PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router";

import { useGeneralStore } from "../../store";
import MusicControlsCoreControlButtons from "./core-control-buttons";
import MusicControlsSongInfo from "./song-info";

type TProps = {
  className?: string;
};

const MusicControlsMobile = ({ className }: TProps) => {
  const [tempPathname, setTempPathname] = useState<string | null>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { searchInputRef, isSearching } = useGeneralStore();
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The temp pathname helps the active button not jump from one button to another for one frame
  const nav = (path: string) => {
    if (navTimeoutRef.current) {
      clearTimeout(navTimeoutRef.current);
    }

    setTempPathname(path);
    navigate(path);

    navTimeoutRef.current = setTimeout(() => {
      setTempPathname(null);
    }, 250);
  };

  const path = tempPathname || pathname;

  return (
    <div className={clsx("flex w-full flex-col gap-3", className)}>
      <div className="flex w-full flex-1 justify-between gap-2">
        <div className="min-h-10 flex-1">
          <MusicControlsSongInfo />
        </div>

        <div className="flex items-center gap-3">
          <MusicControlsCoreControlButtons />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <BottomButton isActive={!isSearching && !path.startsWith("/library")} onPointerDown={() => nav("/")}>
          <MusicIcon />
        </BottomButton>
        <BottomButton isActive={isSearching} onClick={() => searchInputRef?.current?.focus()}>
          <SearchIcon />
        </BottomButton>
        <BottomButton isActive={!isSearching && path.startsWith("/library")} onPointerDown={() => nav("/library")}>
          <LibraryIcon />
        </BottomButton>
      </div>
    </div>
  );
};

type TBottomButtonProps = {
  isActive?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: () => void;
} & PropsWithChildren;

const BottomButton = ({ isActive, onPointerDown, onClick, children }: TBottomButtonProps) => {
  return (
    <BaseButton
      className={clsx(
        "rounded-full px-5 py-2 text-(--gray-11) transition-colors [&>svg]:size-5 [&>svg]:stroke-[1.5]",
        isActive && "bg-[color-mix(in_srgb,var(--gray-9)_30%,transparent)] text-(--gray-12)",
      )}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {children}
    </BaseButton>
  );
};

export default MusicControlsMobile;
