import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { TrackPlaylist, UserPlaylistSummary } from "../types";

import { request } from "../utils/http";
import { createHttpError } from "../utils/http-error";

type TrackPlaylistActionInput = {
  playlistId: number;
  trackId: number;
};

type MutationActionOptions<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
  onSettled?: () => void;
};

const useTrackPlaylistActions = () => {
  const queryClient = useQueryClient();

  const addTrackMutation = useMutation({
    mutationFn: async ({ playlistId, trackId }: TrackPlaylistActionInput) => {
      const resp = await request(`/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      if (!resp.ok) {
        throw await createHttpError(resp, "failed to add track to playlist");
      }
    },
    onSuccess: (_data, { playlistId, trackId }) => {
      const userPlaylists = queryClient.getQueryData<UserPlaylistSummary[]>(["user-playlists"]);
      const addedPlaylist = userPlaylists?.find((playlist) => playlist.id === playlistId);

      queryClient.setQueryData<TrackPlaylist[] | undefined>(["track-playlists", trackId], (current) => {
        if (!current) {
          return current;
        }

        if (current.some((playlist) => playlist.id === playlistId) || !addedPlaylist) {
          return current;
        }

        return [
          ...current,
          {
            id: addedPlaylist.id,
            name: addedPlaylist.name,
            coverUrls: addedPlaylist.coverUrls,
          },
        ];
      });

      queryClient.invalidateQueries({ queryKey: ["track-playlists", trackId] });
      queryClient.invalidateQueries({ queryKey: ["user-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
    },
  });

  const removeTrackMutation = useMutation({
    mutationFn: async ({ playlistId, trackId }: TrackPlaylistActionInput) => {
      const resp = await request(`/playlists/${playlistId}/tracks/${trackId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        throw await createHttpError(resp, "failed to remove track from playlist");
      }
    },
    onSuccess: (_data, { playlistId, trackId }) => {
      queryClient.setQueryData<TrackPlaylist[] | undefined>(["track-playlists", trackId], (current) => {
        if (!current) {
          return current;
        }

        return current.filter((playlist) => playlist.id !== playlistId);
      });

      queryClient.invalidateQueries({ queryKey: ["track-playlists", trackId] });
      queryClient.invalidateQueries({ queryKey: ["user-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["favorite-track", trackId] });
      queryClient.invalidateQueries({ queryKey: ["favorite-tracks"] });
    },
  });

  const addTrackToPlaylist = async (trackId: number, playlistId: number, options?: MutationActionOptions<void>) => {
    try {
      await addTrackMutation.mutateAsync({ trackId, playlistId });
      options?.onSuccess?.();
    } catch (error) {
      options?.onError?.(error);
      throw error;
    } finally {
      options?.onSettled?.();
    }
  };

  const removeTrackFromPlaylist = async (
    trackId: number,
    playlistId: number,
    options?: MutationActionOptions<void>,
  ) => {
    try {
      await removeTrackMutation.mutateAsync({ trackId, playlistId });
      options?.onSuccess?.();
    } catch (error) {
      options?.onError?.(error);
      throw error;
    } finally {
      options?.onSettled?.();
    }
  };

  return {
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    isAddingTrack: addTrackMutation.isPending,
    isRemovingTrack: removeTrackMutation.isPending,
  };
};

export default useTrackPlaylistActions;
