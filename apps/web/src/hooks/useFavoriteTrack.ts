import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { request } from "../utils/http";

const useFavoriteTrack = (trackId?: number) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["favorite-track", trackId],
    queryFn: async () => {
      const resp = await request(`/favorites/tracks/${trackId}`);
      const json: { favorited: boolean } = await resp.json();
      return json.favorited;
    },
    enabled: trackId !== undefined,
  });

  const mutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await request("/favorites/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json: { favorited: boolean } = await resp.json();
      return json.favorited;
    },
    onMutate: async (id) => {
      const queryKey = ["favorite-track", id] as const;

      await queryClient.cancelQueries({ queryKey });
      const previousFavorited = queryClient.getQueryData<boolean>(queryKey);

      queryClient.setQueryData(queryKey, (currentValue: boolean | undefined) => !(currentValue ?? false));

      return {
        queryKey,
        previousFavorited,
      };
    },
    onError: (_error, _id, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, context.previousFavorited);
      }
    },
    onSuccess: (favorited, id) => {
      const queryKey = ["favorite-track", id] as const;
      queryClient.setQueryData(queryKey, favorited);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["favorite-tracks"] });
    },
  });

  return {
    isFavorited: query.data ?? false,
    isLoading: query.isLoading,
    toggleFavorite: () => {
      if (trackId !== undefined) {
        mutation.mutate(trackId);
      }
    },
  };
};

export default useFavoriteTrack;
