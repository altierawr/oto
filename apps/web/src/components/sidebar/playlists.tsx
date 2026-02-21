import { Sidebar as AwltSidebar } from "@awlt/design";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";

import useUserPlaylists from "@/hooks/useUserPlaylists";
import { getTidalCoverUrl } from "@/utils/image";

import CoverBlock, { CoverBlockVariant } from "../music-blocks/cover-block";
import CreatePlaylistDialog from "../playlists/create-playlist-dialog";

const SidebarPlaylistsGroup = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: playlists } = useUserPlaylists();
  const [isCreatePlaylistDialogOpen, setIsCreatePlaylistDialogOpen] = useState(false);

  return (
    <AwltSidebar.Group variant="compact">
      <AwltSidebar.GroupHeader>
        <AwltSidebar.GroupTitle>
          <span>Playlists</span>
        </AwltSidebar.GroupTitle>
        <CreatePlaylistDialog
          isOpen={isCreatePlaylistDialogOpen}
          onOpenChange={setIsCreatePlaylistDialogOpen}
          triggerRender={
            <AwltSidebar.GroupAction tooltip="Create playlist">
              <PlusIcon />
            </AwltSidebar.GroupAction>
          }
        />
      </AwltSidebar.GroupHeader>

      <AwltSidebar.List>
        {playlists?.map((playlist) => {
          return (
            <AwltSidebar.Item key={playlist.id} tooltip={playlist.name}>
              <AwltSidebar.ItemButton
                isActive={pathname === `/playlists/${playlist.id}`}
                onClick={() => navigate(`/playlists/${playlist.id}`)}
              >
                <AwltSidebar.ItemButtonImageBlock>
                  <CoverBlock
                    imageUrls={playlist.coverUrls.map((url) => getTidalCoverUrl(url, 80))}
                    variant={CoverBlockVariant.COVER_ONLY}
                  />
                </AwltSidebar.ItemButtonImageBlock>
                <AwltSidebar.ItemButtonBody>
                  <p>{playlist.name}</p>
                  <p className="text-xs text-(--gray-11)!">{playlist.numberOfTracks} tracks</p>
                </AwltSidebar.ItemButtonBody>
              </AwltSidebar.ItemButton>
            </AwltSidebar.Item>
          );
        })}
      </AwltSidebar.List>
    </AwltSidebar.Group>
  );
};

export default SidebarPlaylistsGroup;
