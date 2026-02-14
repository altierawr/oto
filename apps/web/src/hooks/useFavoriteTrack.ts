import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { request } from "../utils/http";

const useFavoriteTrack = (trackId: number) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["favorite-track", trackId],
    queryFn: async () => {
      const resp = await request(`/favorites/tracks/${trackId}`);
      const json: { favorited: boolean } = await resp.json();
      return json.favorited;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const resp = await request("/favorites/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trackId }),
      });
      const json: { favorited: boolean } = await resp.json();
      return json.favorited;
    },
    onSuccess: (favorited) => {
      queryClient.setQueryData(["favorite-track", trackId], favorited);
      queryClient.invalidateQueries({ queryKey: ["favorite-tracks"] });
    },
  });

  return {
    isFavorited: query.data ?? false,
    isLoading: query.isLoading,
    toggleFavorite: () => mutation.mutate(),
  };
};

export default useFavoriteTrack;
