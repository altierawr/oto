import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { request } from "../utils/http";

const useFavoriteArtist = (artistId: number | string) => {
  const queryClient = useQueryClient();
  const id = Number(artistId);

  const query = useQuery({
    queryKey: ["favorite-artist", String(id)],
    queryFn: async () => {
      const resp = await request(`/favorites/artists/${id}`);
      const json: { favorited: boolean } = await resp.json();
      return json.favorited;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const resp = await request("/favorites/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json: { favorited: boolean } = await resp.json();
      return json.favorited;
    },
    onSuccess: (favorited) => {
      queryClient.setQueryData(["favorite-artist", String(id)], favorited);
      queryClient.invalidateQueries({ queryKey: ["favorite-artists"] });
    },
  });

  return {
    isFavorited: query.data ?? false,
    isLoading: query.isLoading,
    toggleFavorite: () => mutation.mutate(),
  };
};

export default useFavoriteArtist;
