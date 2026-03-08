import { useQuery } from "@tanstack/react-query";

import type { Song } from "../types";

import { request } from "../utils/http";

const useUserTopTracks = () => {
  return useQuery({
    queryKey: ["user-top-tracks"],
    queryFn: async () => {
      const resp = await request("/toptracks");
      if (!resp.ok) {
        throw new Error(`failed to fetch user top tracks (${resp.status})`);
      }

      return (await resp.json()) as Song[];
    },
  });
};

export default useUserTopTracks;
