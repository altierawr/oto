import { Button, Dialog, Input, toastManager } from "@awlt/design";
import { useEffect, useState } from "react";
import { type ComponentProps } from "react";
import { useNavigate } from "react-router";

import type { UserPlaylistSummary } from "@/types";

import usePlaylistActions from "@/hooks/usePlaylistActions";
import { isHttpError } from "@/utils/http-error";

type TProps = {
  triggerRender?: ComponentProps<typeof Dialog.Trigger>["render"];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPlaylistCreated?: (playlist: UserPlaylistSummary) => void;
  announcePlaylistCreation?: boolean;
};

const CreatePlaylistDialog = ({
  triggerRender,
  isOpen,
  onOpenChange,
  onPlaylistCreated,
  announcePlaylistCreation = true,
}: TProps) => {
  const [playlistName, setPlaylistName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { createPlaylist, isCreatingPlaylist } = usePlaylistActions();
  const navigate = useNavigate();

  const handlePlaylistCreate = async () => {
    setFieldError(null);
    setFormError(null);

    try {
      const playlist = await createPlaylist(playlistName);
      if (announcePlaylistCreation) {
        toastManager.add({
          title: "Created playlist",
          description: `Playlist ${playlist.name} was created!`,
          type: "success",
          actionProps: {
            children: "View playlist",
            onClick: () => {
              navigate(`/playlists/${playlist.id}`);
            },
          },
        });
      }

      onPlaylistCreated?.(playlist);
      onOpenChange(false);
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

  useEffect(() => {
    if (!isOpen) {
      setPlaylistName("");
      setFormError(null);
      setFieldError(null);
    }
  }, [isOpen]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      {triggerRender && <Dialog.Trigger render={triggerRender} />}
      <Dialog.Popup>
        <Dialog.Header>
          <Dialog.Title>Create new playlist</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Dialog.Description>Enter the name for the new playlist:</Dialog.Description>
          <Input
            className="w-full"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            onKeyDown={(e) => {
              if (e.code === "Enter") {
                handlePlaylistCreate();
              }
            }}
            errors={fieldError ? [fieldError] : undefined}
          />
          {formError && <p className="text-sm text-(--red-11)">{formError}</p>}
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close>Cancel</Dialog.Close>
          <Button color="blue" onClick={handlePlaylistCreate} isLoading={isCreatingPlaylist}>
            Create playlist
          </Button>
        </Dialog.Footer>
      </Dialog.Popup>
    </Dialog.Root>
  );
};

export default CreatePlaylistDialog;
