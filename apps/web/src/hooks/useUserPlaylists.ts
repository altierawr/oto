import { useQuery } from "@tanstack/react-query";

import type { UserPlaylistSummary } from "../types";

import { request } from "../utils/http";

const useUserPlaylists = () => {
  return useQuery({
    queryKey: ["user-playlists"],
    queryFn: async () => {
      const resp = await request("/playlists");
      if (!resp.ok) {
        throw new Error(`failed to fetch playlists (${resp.status})`);
      }

      return (await resp.json()) as UserPlaylistSummary[];
    },
  });
};

export default useUserPlaylists;
