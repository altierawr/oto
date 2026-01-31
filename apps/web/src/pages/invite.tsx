import { useMutation } from "@tanstack/react-query";
import { Button, Spacer } from "design";
import { useState } from "react";
import { request } from "../utils/http";

const InvitePage = () => {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="h-dvh bg-(--gray-0) text-(--gray-12) relative grid place-items-center">
      <div className="min-w-[350px] max-w-[370px] grid content-start">
        {inviteCode && (
          <p>
            Invite code: <span className="select-text">{inviteCode}</span>
          </p>
        )}

        {!inviteCode && (
          <>
            <h1 className="font-semibold text-2xl text-center">
              Create invite code
            </h1>
            <p className="text-sm text-(--gray-11) text-center mx-auto">
              User registration requires an invite code. Create one here and
              give it to a user who wants access to the server.
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
