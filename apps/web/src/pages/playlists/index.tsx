import { IconButton, Loader, Spacer } from "@awlt/design";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

import MusicBlockGrid from "@/components/music-blocks/music-block-grid";
import PlaylistBlock from "@/components/music-blocks/playlist-block";
import CreatePlaylistDialog from "@/components/playlists/create-playlist-dialog";
import useUserPlaylists from "@/hooks/useUserPlaylists";

const PlaylistsPage = () => {
  const query = useUserPlaylists();
  const playlists = query.data || [];
  const [isCreatePlaylistDialogOpen, setIsCreatePlaylistDialogOpen] = useState(false);

  return (
    <>
      <div className="flex w-full items-center gap-4">
        <h1 className="text-3xl font-bold">Playlists</h1>
        <CreatePlaylistDialog
          isOpen={isCreatePlaylistDialogOpen}
          onOpenChange={setIsCreatePlaylistDialogOpen}
          triggerRender={
            <IconButton color="gray" size="xs" variant="soft">
              <PlusIcon />
            </IconButton>
          }
        />
      </div>

      <Spacer size="4" />

      {query.isLoading && <Loader />}

      {!query.isLoading && playlists.length > 0 && (
        <MusicBlockGrid>
          {playlists.map((playlist) => (
            <PlaylistBlock key={playlist.id} playlist={playlist} />
          ))}
        </MusicBlockGrid>
      )}

      {!query.isLoading && playlists.length === 0 && (
        <p className="text-sm text-(--gray-11)">You haven&apos;t created any playlists.</p>
      )}

      <Spacer size="12" />
    </>
  );
};

export default PlaylistsPage;
