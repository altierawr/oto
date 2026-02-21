import { useQuery } from "@tanstack/react-query";

import type { UserPlaylist, UserPlaylistSummary } from "../types";

import { usePlayerState } from "../store";
import { request } from "../utils/http";

type TProps = {
  playlist?: UserPlaylistSummary;
};

const usePlaylistPlayback = ({ playlist }: TProps) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["playlist", playlist?.id],
    queryFn: async () => {
      if (!playlist) {
        throw new Error("playlist is undefined in usePlaylistPlayback hook");
      }

      const resp = await request(`/playlists/${playlist.id}`);
      if (!resp.ok) {
        throw new Error(`failed to fetch playlist (${resp.status})`);
      }

      const json: UserPlaylist = await resp.json();

      return json;
    },
    enabled: false,
  });

  const { player, song } = usePlayerState();

  let isPlaying = true;
  if (!data?.tracks || !song) {
    isPlaying = false;
  } else {
    for (let i = 0; i < player.playlist.length; i++) {
      const { song } = (player.originalPlaylist || player.playlist)[i];

      if (i >= data.tracks.length || song.id !== data.tracks[i].id) {
        isPlaying = false;
        break;
      }
    }
  }

  const onPlayClick = async () => {
    if (isPlaying) {
      player.togglePlayPause();
      return;
    }

    let tracks = data?.tracks;

    if (!tracks) {
      if (isLoading) {
        return;
      }

      const resp = await refetch();
      tracks = resp.data?.tracks;
    }

    if (!tracks || tracks.length === 0) {
      console.log("No tracks for playlist", playlist?.id);
      return;
    }

    player.playSongs(tracks, 0);
  };

  return { onPlayClick, isLoading, isPlaying };
};

export default usePlaylistPlayback;
