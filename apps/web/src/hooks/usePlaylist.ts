import { useQuery } from "@tanstack/react-query";

import type { UserPlaylist } from "../types";

import { request } from "../utils/http";

const usePlaylist = (playlistId?: number) => {
  return useQuery({
    queryKey: ["playlist", playlistId],
    queryFn: async () => {
      const resp = await request(`/playlists/${playlistId}`);
      if (!resp.ok) {
        throw new Error(`failed to fetch playlist (${resp.status})`);
      }

      return (await resp.json()) as UserPlaylist;
    },
    enabled: playlistId !== undefined,
    retry: false,
  });
};

export default usePlaylist;
