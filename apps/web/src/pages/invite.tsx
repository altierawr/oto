import { Button, Spacer } from "@awlt/design";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { request } from "../utils/http";

const InvitePage = () => {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [_, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationKey: ["invitecode"],
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setError(null);
      const resp = await request("/tokens/invitecode", {
        method: "POST",
      });

      const data = await resp.json();

      if (resp.status === 201) {
        setInviteCode(data.token.token);
        return;
      }

      console.log({ data });
      console.log(resp.status);
      setError("Something went wrong");
    },
  });

  return (
    <div className="relative grid h-dvh place-items-center bg-(--gray-0) text-(--gray-12)">
      <div className="grid max-w-[370px] min-w-[350px] content-start">
        {inviteCode && (
          <p>
            Invite code: <span className="select-text">{inviteCode}</span>
          </p>
        )}

        {!inviteCode && (
          <>
            <h1 className="text-center text-2xl font-semibold">Create invite code</h1>
            <p className="mx-auto text-center text-sm text-(--gray-11)">
              User registration requires an invite code. Create one here and give it to a user who wants access to the
              server.
            </p>

            <Spacer size="8" />

            <Button
              variant="solid"
              color="blue"
              isLoading={mutation.isPending}
              className="w-full"
              onClick={() => mutation.mutate()}
            >
              Create code
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
