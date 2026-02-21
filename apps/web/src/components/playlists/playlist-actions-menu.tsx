import { AlertDialog, Button, Dialog, IconButton, Input, Menu, toastManager } from "@awlt/design";
import { MoreHorizontalIcon, PenIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import type { UserPlaylistSummary } from "@/types";

import usePlaylistActions from "@/hooks/usePlaylistActions";
import { isHttpError } from "@/utils/http-error";

type TProps = {
  playlist: UserPlaylistSummary;
};

const PlaylistActionsMenu = ({ playlist }: TProps) => {
  const [renameDialogHandle] = useState(Dialog.createHandle());
  const [alertDialogHandle] = useState(AlertDialog.createHandle());
  const [playlistName, setPlaylistName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { deletePlaylist, renamePlaylist, isRenamingPlaylist } = usePlaylistActions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDialogOpen) {
      setPlaylistName("");
      setFormError(null);
      setFieldError(null);
    }
  }, [isDialogOpen]);

  const handlePlaylistRename = async () => {
    setFieldError(null);
    setFormError(null);

    try {
      await renamePlaylist(playlist.id, playlistName);
      setIsDialogOpen(false);
    } catch (error) {
      if (isHttpError<{ error?: Record<string, string> }>(error)) {
        if (error.status === 422 && error.data?.error?.name) {
          setFieldError(`Name ${error.data.error.name}`);
        } else {
          setFormError("Something went wrong");
        }
      }
    }
  };

  const handlePlaylistDelete = async () => {
    try {
      await deletePlaylist(playlist.id);

      toastManager.add({
        title: "Playlist deleted",
        description: `Playlist ${playlist.name} was deleted.`,
        type: "success",
      });

      navigate("/playlists");
    } catch (err) {
      console.error({ err });
      toastManager.add({
        title: "Couldn't delete playlist",
        description: `Something went wrong while deleting the playlist ${playlist.name}.`,
        type: "error",
      });
    }
  };

  return (
    <>
      <Menu.Root>
        <Menu.Trigger render={<IconButton color="gray" variant="soft" />}>
          <MoreHorizontalIcon />
        </Menu.Trigger>
        <Menu.Popup>
          <Dialog.Trigger
            handle={renameDialogHandle}
            nativeButton={false}
            render={
              <Menu.Item onClick={() => setIsDialogOpen(true)}>
                <PenIcon />
                Rename playlist
              </Menu.Item>
            }
          />
          <AlertDialog.Trigger
            handle={alertDialogHandle}
            nativeButton={false}
            render={
              <Menu.Item>
                <Trash2Icon />
                Delete playlist
              </Menu.Item>
            }
          />
        </Menu.Popup>
      </Menu.Root>

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen} handle={renameDialogHandle}>
        <Dialog.Popup>
          <Dialog.Header>
            <Dialog.Title>Rename playlist</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Description>Enter the new name for the playlist:</Dialog.Description>
            <Input
              className="w-full"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.code === "Enter") {
                  handlePlaylistRename();
                }
              }}
              errors={fieldError ? [fieldError] : undefined}
            />
            {formError && <p className="text-sm text-(--red-11)">{formError}</p>}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close>Cancel</Dialog.Close>
            <Button color="blue" onClick={handlePlaylistRename} isLoading={isRenamingPlaylist}>
              Rename playlist
            </Button>
          </Dialog.Footer>
        </Dialog.Popup>
      </Dialog.Root>

      <AlertDialog.Root handle={alertDialogHandle}>
        <AlertDialog.Popup>
          <AlertDialog.Header>
            <AlertDialog.Title>Delete playlist</AlertDialog.Title>
          </AlertDialog.Header>
          <AlertDialog.Body>
            <AlertDialog.Description>
              Are you sure you want to delete the playlist <span className="font-bold">{playlist.name}</span>?
            </AlertDialog.Description>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <AlertDialog.Close>Cancel</AlertDialog.Close>
            <AlertDialog.Close
              render={
                <Button color="red" onClick={handlePlaylistDelete}>
                  Delete playlist
                </Button>
              }
            />
          </AlertDialog.Footer>
        </AlertDialog.Popup>
      </AlertDialog.Root>
    </>
  );
};

export default PlaylistActionsMenu;
