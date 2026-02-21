import { Menu } from "@awlt/design";

import type { UserPlaylistSummary } from "@/types";

import useTrackPlaylistActions from "@/hooks/useTrackPlaylistActions";

type TProps = {
  trackId: number;
  playlist: UserPlaylistSummary;
  isInPlaylist: boolean;
};

const TrackPlaylistSubmenuItem = ({ trackId, playlist, isInPlaylist }: TProps) => {
  const { addTrackToPlaylist, isAddingTrack, removeTrackFromPlaylist, isRemovingTrack } = useTrackPlaylistActions();

  const handleClick = () => {
    if (isInPlaylist) {
      removeTrackFromPlaylist(trackId, playlist.id);
    } else {
      addTrackToPlaylist(trackId, playlist.id, {
        onError: (err) => {
          console.log({ err });
        },
      });
    }
  };

  return (
    <Menu.CheckboxItem checked={isInPlaylist} isLoading={isAddingTrack || isRemovingTrack} onClick={handleClick}>
      {playlist.name}
    </Menu.CheckboxItem>
  );
};

export default TrackPlaylistSubmenuItem;
