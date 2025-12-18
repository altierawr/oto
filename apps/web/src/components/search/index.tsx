import { useEffect, useRef, useState } from "react";
import { Input, Spacer } from "design";
import SearchHeader, { type SearchTab } from "./header";
import type { SearchResults } from "../../types";
import ArtistSearchResult from "./results/artist";
import AlbumSearchResult from "./results/album";
import SongSearchResult from "./results/song";
import PlaylistSearchResult from "./results/playlist";
import TopHitSearchResult from "./results/top-hit";

const SearchInput = () => {
  const [searchValue, setSearchValue] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<number | undefined>();
  const [searchTab, setSearchTab] = useState<SearchTab>("topHits");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(
    null,
  );
  const [isFocused, setIsFocused] = useState(false);

  const resultsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearTimeout(searchTimeout);

    const value = searchValue.trim();

    if (value === "") {
      setSearchResults(null);
      return;
    }

    const timeout = setTimeout(async () => {
      const resp = await fetch(
        `http://localhost:3003/v1/search?query=${searchValue}`,
      );

      if (resp.status !== 200) {
        console.error("Resp failed with status", resp.status, ":", resp);
        setSearchResults(null);
        return;
      }

      const result = await resp.json();

      setSearchResults(result.result);
    }, 1000);

    setSearchTimeout(timeout);
  }, [searchValue]);

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
        className="w-full"
        value={searchValue}
        onChange={handleSearchValueChange}
        onFocus={handleFocusGain}
        onBlur={handleFocusLoss}
      />

      <div
        tabIndex={0}
        className="absolute left-0 top-full mt-2 w-full h-[500px] bg-(--gray-0) rounded-md flex flex-col p-3 border border-(--gray-6)"
        style={{
          pointerEvents: isVisible ? "unset" : "none",
          opacity: isVisible ? "1" : "0",
          transform: isVisible ? "translate(0, 0)" : "translate(0, 5px)",
          transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
        }}
        onFocus={handleFocusGain}
        onBlur={handleFocusLoss}
      >
        <SearchHeader tab={searchTab} onTabChange={handleSearchTabChange} />
        <Spacer size="2" />

        <div
          ref={resultsListRef}
          className="flex flex-col flex-1 gap-2 overflow-y-auto overflow-x-clip"
        >
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
              <ArtistSearchResult
                key={artist.id}
                artist={artist}
                onClose={handleFocusLoss}
              />
            ))}

          {searchTab === "albums" &&
            searchResults?.albums?.map((album) => (
              <AlbumSearchResult
                key={album.id}
                album={album}
                onClose={handleFocusLoss}
              />
            ))}

          {searchTab === "songs" &&
            searchResults?.songs?.map((song) => (
              <SongSearchResult
                key={song.id}
                song={song}
                onClose={handleFocusLoss}
              />
            ))}

          {searchTab === "playlists" &&
            searchResults?.playlists?.map((playlist) => (
              <PlaylistSearchResult
                key={playlist.uuid}
                playlist={playlist}
                onClose={handleFocusLoss}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default SearchInput;
