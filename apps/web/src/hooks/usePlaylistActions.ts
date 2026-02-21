import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UserPlaylist, UserPlaylistSummary } from "../types";

import { request } from "../utils/http";
import { createHttpError } from "../utils/http-error";

type RenamePlaylistInput = {
  playlistId: number;
  name: string;
};

type MutationActionOptions<TData> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: unknown) => void;
  onSettled?: () => void;
};

const usePlaylistActions = () => {
  const queryClient = useQueryClient();

  const createPlaylistMutation = useMutation({
    mutationFn: async (name: string) => {
      const resp = await request("/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!resp.ok) {
        throw await createHttpError(resp, "failed to create playlist");
      }

      return (await resp.json()) as UserPlaylistSummary;
    },
    onSuccess: (playlist) => {
      queryClient.setQueryData<UserPlaylistSummary[]>(["user-playlists"], (current) => {
        if (!current) {
          return [playlist];
        }

        return [playlist, ...current];
      });

      queryClient.setQueryData<UserPlaylist>(["playlist", playlist.id], {
        ...playlist,
        tracks: [],
      });

      queryClient.invalidateQueries({ queryKey: ["user-playlists"] });
    },
  });

  const renamePlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, name }: RenamePlaylistInput) => {
      const resp = await request(`/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!resp.ok) {
        throw await createHttpError(resp, "failed to rename playlist");
      }

      return (await resp.json()) as UserPlaylistSummary;
    },
    onSuccess: (playlist) => {
      queryClient.setQueryData<UserPlaylistSummary[]>(["user-playlists"], (current) =>
        current?.map((item) => (item.id === playlist.id ? playlist : item)),
      );

      queryClient.setQueryData<UserPlaylist | undefined>(["playlist", playlist.id], (current) => {
        if (!current) {
          return undefined;
        }

        return {
          ...current,
          name: playlist.name,
          numberOfTracks: playlist.numberOfTracks,
          duration: playlist.duration,
          coverUrls: playlist.coverUrls,
        };
      });

      queryClient.invalidateQueries({ queryKey: ["track-playlists"] });
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (playlistId: number) => {
      const resp = await request(`/playlists/${playlistId}`, {
        method: "DELETE",
      });
      if (!resp.ok) {
        throw await createHttpError(resp, "failed to delete playlist");
      }
    },
    onSuccess: (_data, playlistId) => {
      queryClient.setQueryData<UserPlaylistSummary[]>(["user-playlists"], (current) =>
        current?.filter((item) => item.id !== playlistId),
      );

      queryClient.removeQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["track-playlists"] });
      queryClient.invalidateQueries({ queryKey: ["user-playlists"] });
    },
  });

  const createPlaylist = async (name: string, options?: MutationActionOptions<UserPlaylistSummary>) => {
    try {
      const playlist = await createPlaylistMutation.mutateAsync(name);
      options?.onSuccess?.(playlist);
      return playlist;
    } catch (error) {
      options?.onError?.(error);
      throw error;
    } finally {
      options?.onSettled?.();
    }
  };

  const renamePlaylist = async (
    playlistId: number,
    name: string,
    options?: MutationActionOptions<UserPlaylistSummary>,
  ) => {
    try {
      const playlist = await renamePlaylistMutation.mutateAsync({ playlistId, name });
      options?.onSuccess?.(playlist);
      return playlist;
    } catch (error) {
      options?.onError?.(error);
      throw error;
    } finally {
      options?.onSettled?.();
    }
  };

  const deletePlaylist = async (playlistId: number, options?: MutationActionOptions<void>) => {
    try {
      await deletePlaylistMutation.mutateAsync(playlistId);
      options?.onSuccess?.();
    } catch (error) {
      options?.onError?.(error);
      throw error;
    } finally {
      options?.onSettled?.();
    }
  };

  return {
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    isCreatingPlaylist: createPlaylistMutation.isPending,
    isRenamingPlaylist: renamePlaylistMutation.isPending,
    isDeletingPlaylist: deletePlaylistMutation.isPending,
  };
};

export default usePlaylistActions;
