import { Input, ScrollArea } from "@awlt/design";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import type { SearchResults } from "../../types";

import { request } from "../../utils/http";
import SearchHeader, { type SearchTab } from "./header";
import AlbumSearchResult from "./results/album";
import ArtistSearchResult from "./results/artist";
import PlaylistSearchResult from "./results/playlist";
import SongSearchResult from "./results/song";
import TopHitSearchResult from "./results/top-hit";

const SearchInput = () => {
  const [searchValue, setSearchValue] = useState("");
  const [searchTab, setSearchTab] = useState<SearchTab>("topHits");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { pathname } = useLocation();

  const resultsListRef = useRef<HTMLDivElement>(null);

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
    setIsFocused(false);
  }, [pathname]);

  const handleSearchValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleFocusGain = () => {
    setIsFocused(true);
  };

  const handleFocusLoss = () => {
    setIsFocused(false);
  };

  const handleSearchTabChange = (tab: SearchTab) => {
    setSearchTab(tab);

    resultsListRef.current?.scrollTo({
      top: 0,
      behavior: "instant",
    });
  };

  const isVisible = isFocused && searchValue.trim() !== "";

  return (
    <div className="relative w-[360px]">
      <Input
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
        className="absolute top-full left-0 z-1 mt-2 flex h-[500px] w-full flex-col rounded-md border border-(--gray-6) bg-(--gray-3) pt-3 pb-1 shadow-2xl"
        style={{
          pointerEvents: isVisible ? "unset" : "none",
          opacity: isVisible ? "1" : "0",
          transform: isVisible ? "translate(0, 0)" : "translate(0, 5px)",
          transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
        }}
        onFocus={handleFocusGain}
        onBlur={handleFocusLoss}
      >
        <div className="px-3">
          <SearchHeader tab={searchTab} onTabChange={handleSearchTabChange} />
        </div>

        <div className="flex-1 overflow-y-hidden">
          <ScrollArea
            ref={resultsListRef}
            className="flex flex-col gap-2 pt-2 pl-3"
            removeScrollbarVerticalMargins
            includeScrollbarLeftMargin
          >
            <div>
              {searchTab === "topHits" &&
                searchResults?.topHits?.map((topHit) => (
                  <TopHitSearchResult
                    // @ts-ignore
                    key={topHit.value.id || topHit.value.uuid}
                    topHit={topHit}
                    onClose={handleFocusLoss}
                  />
                ))}

              {searchTab === "artists" &&
                searchResults?.artists?.map((artist) => (
                  <ArtistSearchResult key={artist.id} artist={artist} onClose={handleFocusLoss} />
                ))}

              {searchTab === "albums" &&
                searchResults?.albums?.map((album) => (
                  <AlbumSearchResult key={album.id} album={album} onClose={handleFocusLoss} />
                ))}

              {searchTab === "songs" &&
                searchResults?.songs?.map((song) => (
                  <SongSearchResult key={song.id} song={song} onClose={handleFocusLoss} />
                ))}

              {searchTab === "playlists" &&
                searchResults?.playlists?.map((playlist) => (
                  <PlaylistSearchResult key={playlist.uuid} playlist={playlist} onClose={handleFocusLoss} />
                ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default SearchInput;
