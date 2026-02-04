import { Toggle, ToggleGroup } from "@base-ui/react";
import clsx from "clsx";
import { Button } from "@awlt/design";

export type SearchTab =
  | "topHits"
  | "artists"
  | "albums"
  | "songs"
  | "playlists";

type TProps = {
  tab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
};

const SearchHeader = ({ tab, onTabChange }: TProps) => {
  return (
    <div className="flex gap-2 items-center">
      <ToggleGroup
        className="w-full flex -space-x-px"
        value={[tab]}
        onValueChange={(value) => {
          if (value.length !== 0) {
            onTabChange(value[0]);
          }
        }}
      >
        <Toggle
          aria-label="Top hits"
          value="topHits"
          render={(props, state) => (
            <Button
              color="gray"
              variant="surface"
              size="xs"
              className={clsx("flex-1 rounded-r-none!", state.pressed && "z-0")}
              {...(props as any)}
            >
              Top Hits
            </Button>
          )}
        />
        <Toggle
          aria-label="Artists"
          value="artists"
          render={(props, state) => (
            <Button
              color="gray"
              variant="surface"
              size="xs"
              className={clsx(
                "flex-1 rounded-l-none! rounded-r-none!",
                state.pressed && "z-0",
              )}
              {...(props as any)}
            >
              Artists
            </Button>
          )}
        />
        <Toggle
          aria-label="Albums"
          value="albums"
          render={(props, state) => (
            <Button
              color="gray"
              variant="surface"
              size="xs"
              className={clsx(
                "flex-1 rounded-l-none! rounded-r-none!",
                state.pressed && "z-0",
              )}
              {...(props as any)}
            >
              Albums
            </Button>
          )}
        />
        <Toggle
          aria-label="Songs"
          value="songs"
          render={(props, state) => (
            <Button
              color="gray"
              variant="surface"
              size="xs"
              className={clsx(
                "flex-1 rounded-l-none! rounded-r-none!",
                state.pressed && "z-0",
              )}
              {...(props as any)}
            >
              Songs
            </Button>
          )}
        />
        <Toggle
          aria-label="Playlists"
          value="playlists"
          render={(props, state) => (
            <Button
              color="gray"
              variant="surface"
              size="xs"
              className={clsx("flex-1 rounded-l-none!", state.pressed && "z-0")}
              {...(props as any)}
            >
              Playlists
            </Button>
          )}
        />
      </ToggleGroup>
    </div>
  );
};

export default SearchHeader;
