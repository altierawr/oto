import { Input, ScrollArea, Spacer, Tabs } from "@awlt/design";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import type { SearchResults } from "../../types";

import { useGeneralStore } from "../../store";
import { request } from "../../utils/http";
import { type SearchTab } from "./header";
import AlbumSearchResult from "./results/album";
import ArtistSearchResult from "./results/artist";
import PlaylistSearchResult from "./results/playlist";
import SongSearchResult from "./results/song";
import TopHitSearchResult from "./results/top-hit";

const SearchInput = () => {
  const [searchValue, setSearchValue] = useState("");
  const [searchTab, setSearchTab] = useState<SearchTab>("topHits");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { setIsSearching } = useGeneralStore();
  const { pathname } = useLocation();

  useEffect(() => {
    if (searchInputRef.current) {
      useGeneralStore.setState({
        ...useGeneralStore.getState(),
        searchInputRef,
      });
    }
  }, [searchInputRef]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const value = searchValue.trim();

    if (value === "") {
      setSearchResults(null);
      setIsFetching(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const resp = await request(`/search?query=${searchValue}`);

      if (resp.status !== 200) {
        console.error("Resp failed with status", resp.status, ":", resp);
        setSearchResults(null);
        setIsFetching(false);
        return;
      }

      const result: SearchResults = await resp.json();

      setIsFetching(false);
      setSearchResults(result);
    }, 500);

    setIsFetching(true);
  }, [searchValue]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const handleSearchValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    if (value.trim() !== "") {
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleFocusGain = () => {
    setIsSearching(true);
    if (searchValue.trim() !== "") {
      setIsOpen(true);
    }
  };

  const handleFocusLoss = () => {
    if (!isOpen) {
      setIsSearching(false);
    }
  };

  const handleSearchTabChange = (tab: SearchTab) => {
    setSearchTab(tab);
  };

  useEffect(() => {
    setIsSearching(isOpen);
  }, [setIsSearching, isOpen]);

  const isVisible = isOpen && searchValue.trim() !== "";

  return (
    <div ref={searchContainerRef} className="relative w-full md:w-[360px]">
      <Input
        ref={searchInputRef}
        placeholder="Search..."
        className="w-full rounded-full! not-focus:shadow-none!"
        value={searchValue}
        leftIcon={Search}
        isLoading={isFetching}
        onChange={handleSearchValueChange}
        onFocus={handleFocusGain}
        onBlur={handleFocusLoss}
      />

      <div
        tabIndex={0}
        className="absolute top-full left-0 z-1 mt-2 flex h-[500px] w-full flex-col rounded-2xl border border-(--gray-6) bg-(--gray-2) pt-2 pb-1 shadow-2xl"
        style={{
          pointerEvents: isVisible ? "unset" : "none",
          opacity: isVisible ? "1" : "0",
          transform: isVisible ? "translate(0, 0)" : "translate(0, 5px)",
          transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
        }}
        onFocus={handleFocusGain}
      >
        <Tabs.Root value={searchTab} onValueChange={handleSearchTabChange} className="flex h-full flex-col">
          <Tabs.List size="sm" className="mx-2 border border-(--gray-4) bg-(--gray-3)! max-md:justify-center">
            <Tabs.Tab value="topHits" className="max-md:flex-1 max-sm:text-[11px]!">
              Top Hits
            </Tabs.Tab>
            <Tabs.Tab value="artists" className="max-md:flex-1 max-sm:text-[11px]!">
              Artists
            </Tabs.Tab>
            <Tabs.Tab value="albums" className="max-md:flex-1 max-sm:text-[11px]!">
              Albums
            </Tabs.Tab>
            <Tabs.Tab value="songs" className="max-md:flex-1 max-sm:text-[11px]!">
              Songs
            </Tabs.Tab>
            <Tabs.Tab value="playlists" className="max-md:flex-1 max-sm:text-[11px]!">
              Playlists
            </Tabs.Tab>
          </Tabs.List>

          <Spacer size="2" />

          <Tabs.Panel value="topHits" className="h-full flex-1 overflow-y-hidden">
            <ScrollArea className="grid" removeScrollbarVerticalMargins includeScrollbarLeftMargin>
              {searchResults?.topHits?.map((topHit) => (
                <TopHitSearchResult
                  // @ts-ignore
                  key={topHit.value.id || topHit.value.uuid}
                  topHit={topHit}
                  onClose={handleClose}
                />
              ))}
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="artists" className="h-full flex-1 overflow-y-hidden">
            <ScrollArea className="grid" removeScrollbarVerticalMargins includeScrollbarLeftMargin>
              {searchResults?.artists?.map((artist) => (
                <ArtistSearchResult key={artist.id} artist={artist} onClose={handleClose} />
              ))}
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="albums" className="h-full flex-1 overflow-y-hidden">
            <ScrollArea className="grid" removeScrollbarVerticalMargins includeScrollbarLeftMargin>
              {searchResults?.albums?.map((album) => (
                <AlbumSearchResult key={album.id} album={album} onClose={handleClose} />
              ))}
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="songs" className="h-full flex-1 overflow-y-hidden">
            <ScrollArea className="grid" removeScrollbarVerticalMargins includeScrollbarLeftMargin>
              {searchResults?.songs?.map((song) => (
                <SongSearchResult key={song.id} song={song} onClose={handleClose} />
              ))}
            </ScrollArea>
          </Tabs.Panel>

          <Tabs.Panel value="playlists" className="h-full flex-1 overflow-y-hidden">
            <ScrollArea className="grid" removeScrollbarVerticalMargins includeScrollbarLeftMargin>
              {searchResults?.playlists?.map((playlist) => (
                <PlaylistSearchResult key={playlist.uuid} playlist={playlist} onClose={handleClose} />
              ))}
            </ScrollArea>
          </Tabs.Panel>
        </Tabs.Root>
      </div>
    </div>
  );
};

export default SearchInput;
