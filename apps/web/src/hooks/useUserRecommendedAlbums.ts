import { useQuery } from "@tanstack/react-query";

import type { Album } from "../types";

import { request } from "../utils/http";

const useUserRecommendedAlbums = () => {
  return useQuery({
    queryKey: ["user-recommended-albums"],
    queryFn: async () => {
      const resp = await request("/recommendedalbums");
      if (!resp.ok) {
        throw new Error(`failed to fetch user recommended albums (${resp.status})`);
      }

      return (await resp.json()) as {
        recommendedFromAlbum: Album;
        albums: Album[];
      }[];
    },
  });
};

export default useUserRecommendedAlbums;
