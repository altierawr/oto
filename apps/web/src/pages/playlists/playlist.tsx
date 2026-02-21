import { Button, Loader, Spacer } from "@awlt/design";
import clsx from "clsx";
import { PauseIcon, PlayIcon, ShuffleIcon } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router";

import MixedTrackList from "@/components/mixed-track-list";
import CoverBlock, { CoverBlockVariant } from "@/components/music-blocks/cover-block";
import PlaylistActionsMenu from "@/components/playlists/playlist-actions-menu";
import usePlaylist from "@/hooks/usePlaylist";
import usePlaylistPlayback from "@/hooks/usePlaylistPlayback";
import { usePlayerState } from "@/store";
import { getCoverUrl } from "@/utils/image";
import { formatDuration } from "@/utils/utils";

const PlaylistPage = () => {
  const { id } = useParams();
  const { player, playerState } = usePlayerState();

  const playlistId = Number(id);
  const hasValidPlaylistId = id !== undefined && Number.isInteger(playlistId) && playlistId > 0;
  const query = usePlaylist(hasValidPlaylistId ? playlistId : undefined);
  const playlist = query.data;

  const { isLoading: isPlaybackLoading, isPlaying } = usePlaylistPlayback({
    playlist,
  });

  const handlePlayClick = async () => {
    if (isPlaying) {
      player.togglePlayPause();
      return;
    }

    if (playlist?.tracks.length) {
      player.playSongs(playlist.tracks, 0);
    }
  };

  const handleShuffleClick = async () => {
    if (playlist?.tracks.length) {
      await player.enableShuffle();
      player.playSongs(playlist.tracks);
    }
  };

  if (!hasValidPlaylistId) {
    return (
      <>
        <h1 className="text-3xl font-bold">Playlist not found</h1>
        <Spacer size="2" />
        <p className="text-sm text-(--gray-11)">The playlist id is invalid.</p>
      </>
    );
  }

  if (query.isLoading) {
    return <Loader />;
  }

  if (query.isError || !playlist) {
    return (
      <>
        <h1 className="text-3xl font-bold">Playlist not found</h1>
        <Spacer size="2" />
        <p className="text-sm text-(--gray-11)">The playlist does not exist.</p>
      </>
    );
  }

  const imageUrls = playlist.coverUrls.map((coverUrl) => getCoverUrl(coverUrl, 1280));

  return (
    <>
      <Helmet>
        <title>{playlist.name} - oto</title>
      </Helmet>
      <div className="max-w-[900px]">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="mx-auto aspect-square w-[75%] min-w-[200px] sm:mx-0 sm:w-auto">
            <CoverBlock variant={CoverBlockVariant.COVER_ONLY} imageUrls={imageUrls} />
          </div>

          <div className="flex flex-col items-center sm:justify-between md:items-start">
            <div>
              <h1
                className={clsx(
                  "font-bold",
                  "tracking-tight",
                  "max-sm:text-2xl!",
                  "max-sm:text-center",
                  playlist.name.length <= 45 && "text-5xl",
                  playlist.name.length > 45 && "text-4xl",
                  "line-clamp-2",
                )}
              >
                {playlist.name}
              </h1>
              <p className="text-sm max-sm:text-center">Playlist</p>
              <p className="text-sm max-sm:text-center">
                {playlist.numberOfTracks} songs
                {playlist.duration > 0 ? ` • ${formatDuration(playlist.duration || 0, "written")}` : ""}
              </p>
            </div>
            <div className="mt-4 flex w-full gap-4 md:mt-0">
              <Button
                color="blue"
                onClick={handlePlayClick}
                className="max-sm:flex-1"
                isDisabled={playlist.tracks.length === 0}
                isLoading={isPlaybackLoading}
              >
                {isPlaying && !playerState.isPaused && (
                  <>
                    <PauseIcon size={16} fill="currentColor" />
                    Pause
                  </>
                )}
                {(!isPlaying || playerState.isPaused) && (
                  <>
                    <PlayIcon size={16} fill="currentColor" />
                    Play
                  </>
                )}
              </Button>
              <Button
                variant="soft"
                color="gray"
                onClick={handleShuffleClick}
                className="max-sm:flex-1"
                isDisabled={playlist.tracks.length === 0}
              >
                <ShuffleIcon size={16} />
                Shuffle
              </Button>
              <PlaylistActionsMenu playlist={playlist} />
            </div>
          </div>
        </div>

        <Spacer size="4" />

        {playlist.tracks.length > 0 && <MixedTrackList tracks={playlist.tracks} />}

        {playlist.tracks.length === 0 && (
          <p className="text-sm text-(--gray-11)">This playlist doesn't have any tracks yet.</p>
        )}
      </div>
    </>
  );
};

export default PlaylistPage;
