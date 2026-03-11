import { useQuery } from "@tanstack/react-query";

import type { Song } from "../types";

import { request } from "../utils/http";

const useUserRecommendedTracks = () => {
  return useQuery({
    queryKey: ["user-recommended-tracks"],
    queryFn: async () => {
      const resp = await request("/recommendedtracks");
      if (!resp.ok) {
        throw new Error(`failed to fetch user recommended tracks (${resp.status})`);
      }

      return (await resp.json()) as Song[];
    },
  });
};

export default useUserRecommendedTracks;
