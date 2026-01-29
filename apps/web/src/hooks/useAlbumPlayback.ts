import { useQuery } from "@tanstack/react-query";
import type { Album } from "../types";
import { usePlayerState } from "../store";
import { request } from "../utils/http";

type TProps = {
  album: Album;
};

const useAlbumPlayback = ({ album }: TProps) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["album", album.id],
    queryFn: async () => {
      const resp = await request(`/albums/${album.id}`, {
        credentials: "include",
      });

      const json: Album = await resp.json();

      return json;
    },
    enabled: false,
  });

  const { player, song } = usePlayerState();

  let isPlaying = true;
  if (!data?.songs || !song) {
    isPlaying = false;
  } else {
    for (let i = 0; i < player.playlist.length; i++) {
      const { song } = (player.originalPlaylist || player.playlist)[i];

      if (i >= data.songs.length || song.id !== data.songs[i].id) {
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

    let songs = data?.songs;

    if (!songs) {
      if (isLoading) {
        return;
      }

      const resp = await refetch();

      songs = resp.data?.songs;
    }

    if (!songs) {
      console.error("No songs for album", album.id);
      return;
    }

    player.playSongs(songs, 0);
  };

  return { onPlayClick, isLoading, isPlaying };
};

export default useAlbumPlayback;
