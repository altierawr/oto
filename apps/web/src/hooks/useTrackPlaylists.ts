import { useQuery } from "@tanstack/react-query";

import type { TrackPlaylist } from "../types";

import { request } from "../utils/http";

type TProps = {
  trackId?: number;
  isEnabled?: boolean;
};

const useTrackPlaylists = ({ trackId, isEnabled = true }: TProps) => {
  const { refetch, data, isLoading } = useQuery({
    queryKey: ["track-playlists", trackId],
    queryFn: async () => {
      const resp = await request(`/tracks/${trackId}/playlists`);
      if (!resp.ok) {
        throw new Error(`failed to fetch track playlists (${resp.status})`);
      }

      return (await resp.json()) as TrackPlaylist[];
    },
    enabled: isEnabled,
  });

  return {
    playlists: data,
    isLoading,
    fetchPlaylists: refetch,
  };
};

export default useTrackPlaylists;
