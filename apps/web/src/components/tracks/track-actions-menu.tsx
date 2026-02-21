import { Menu, toastManager } from "@awlt/design";
import clsx from "clsx";
import { HeartIcon, ListEndIcon, ListStartIcon } from "lucide-react";
import { useState, type ComponentProps } from "react";

import type { Song, UserPlaylistSummary } from "@/types";

import CreatePlaylistDialog from "@/components/playlists/create-playlist-dialog";
import TrackPlaylistSubmenu from "@/components/track-playlist-submenu";
import useFavoriteTrack from "@/hooks/useFavoriteTrack";
import useTrackPlaylistActions from "@/hooks/useTrackPlaylistActions";
import { usePlayerState } from "@/store";

type TProps = {
  track: Song;
  triggerRender: ComponentProps<typeof Menu.Trigger>["render"];
};

const TrackActionsMenu = ({ track, triggerRender }: TProps) => {
  const { player } = usePlayerState();
  const { isFavorited, toggleFavorite } = useFavoriteTrack(track.id);
  const { addTrackToPlaylist } = useTrackPlaylistActions();
  const [isCreatePlaylistDialogOpen, setIsCreatePlaylistDialogOpen] = useState(false);

  const handlePlayNextClick = () => {
    player.playNext(track);
  };

  const handleAddToQueueClick = () => {
    player.addToQueue(track);
  };

  const handlePlaylistCreated = async (playlist: UserPlaylistSummary) => {
    try {
      await addTrackToPlaylist(track.id, playlist.id);
      toastManager.add({
        title: "Added track to new playlist",
        description: `The track ${track.title} was added to the playlist ${playlist.name}.`,
        type: "success",
      });
    } catch (err) {
      console.error({ err });
      toastManager.add({
        title: "Couldn't add track to playlist",
        description: `Something went wrong while adding track to playlist ${playlist.name}.`,
        type: "error",
      });
    }
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger render={triggerRender} />
        <Menu.Popup>
          <Menu.Item onClick={handlePlayNextClick}>
            <ListStartIcon />
            Play Next
          </Menu.Item>
          <Menu.Item onClick={handleAddToQueueClick}>
            <ListEndIcon />
            Add to Queue
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item onClick={toggleFavorite}>
            <HeartIcon
              fill={isFavorited ? "currentColor" : "none"}
              className={clsx(isFavorited && "text-(--red-9)!")}
            />
            {isFavorited ? "Unfavorite" : "Favorite"}
          </Menu.Item>
          <Menu.Separator />
          <TrackPlaylistSubmenu track={track} onNewPlaylistClick={() => setIsCreatePlaylistDialogOpen(true)} />
        </Menu.Popup>
      </Menu.Root>
      <CreatePlaylistDialog
        isOpen={isCreatePlaylistDialogOpen}
        onOpenChange={setIsCreatePlaylistDialogOpen}
        onPlaylistCreated={handlePlaylistCreated}
        announcePlaylistCreation={false}
      />
    </>
  );
};

export default TrackActionsMenu;
