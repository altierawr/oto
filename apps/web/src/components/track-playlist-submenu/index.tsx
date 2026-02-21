import { Menu } from "@awlt/design";
import { ListPlusIcon } from "lucide-react";
import { useState } from "react";

import type { Song } from "@/types";

import useTrackPlaylists from "@/hooks/useTrackPlaylists";
import useUserPlaylists from "@/hooks/useUserPlaylists";

import TrackPlaylistSubmenuItem from "./item";

type TProps = {
  track: Song;
  onNewPlaylistClick: () => void;
};

const TrackPlaylistSubmenu = ({ track, onNewPlaylistClick }: TProps) => {
  const [shouldFetchTrackPlaylists, setShouldFetchTrackPlaylists] = useState(false);

  const { playlists: trackPlaylists, isLoading: isTrackPlaylistsLoading } = useTrackPlaylists({
    trackId: track.id,
    isEnabled: shouldFetchTrackPlaylists,
  });
  const { data: userPlaylists } = useUserPlaylists();

  return (
    <Menu.Submenu>
      <Menu.SubmenuTrigger
        onMouseOver={() => {
          if (!isTrackPlaylistsLoading && !trackPlaylists) {
            setShouldFetchTrackPlaylists(true);
          }
        }}
      >
        Add to playlist
      </Menu.SubmenuTrigger>
      <Menu.SubmenuPopup>
        <Menu.Item onClick={onNewPlaylistClick}>
          <ListPlusIcon />
          New playlist
        </Menu.Item>
        {userPlaylists && userPlaylists.length > 0 && <Menu.Separator />}
        {userPlaylists?.map((playlist) => (
          <TrackPlaylistSubmenuItem
            key={playlist.id}
            trackId={track.id}
            playlist={playlist}
            isInPlaylist={trackPlaylists && trackPlaylists.findIndex((p) => p.id === playlist.id) >= 0 ? true : false}
          />
        ))}
      </Menu.SubmenuPopup>
    </Menu.Submenu>
  );
};

export default TrackPlaylistSubmenu;
