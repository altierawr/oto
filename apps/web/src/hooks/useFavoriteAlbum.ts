import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { request } from "../utils/http";

const useFavoriteAlbum = (albumId: number) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["favorite-album", albumId],
    queryFn: async () => {
      const resp = await request(`/favorites/albums/${albumId}`);
      if (!resp.ok) {
        throw new Error(`failed to fetch favorite album ${albumId} (${resp.status})`);
      }

      const json: { favorited: boolean } = await resp.json();
      return json.favorited;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const resp = await request("/favorites/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: albumId }),
      });
      const json: { favorited: boolean } = await resp.json();
      return json.favorited;
    },
    onSuccess: (favorited) => {
      queryClient.setQueryData(["favorite-album", albumId], favorited);
      queryClient.invalidateQueries({ queryKey: ["favorite-albums"] });
    },
  });

  return {
    isFavorited: query.data ?? false,
    isLoading: query.isLoading,
    toggleFavorite: () => mutation.mutate(),
  };
};

export default useFavoriteAlbum;
