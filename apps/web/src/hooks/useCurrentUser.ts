import { useQuery } from "@tanstack/react-query";
import { request } from "../utils/http";
import { queryClient } from "../query-client";

export const currentUserQueryKey = "currentUser";

export const invalidateUserQuery = () => {
  queryClient.invalidateQueries({ queryKey: [currentUserQueryKey] });
};

const useCurrentUser = () => {
  const { data: user, ...rest } = useQuery({
    queryKey: [currentUserQueryKey],
    queryFn: async () => {
      const resp = await request("/me");

      if (!resp.ok) {
        if (resp.status === 401) {
          return null;
        }

        throw new Error("something went wrong");
      }

      const data = await resp.json();

      return data;
    },
    staleTime: Infinity,
  });

  return {
    user,
    ...rest,
  };
};

export default useCurrentUser;
