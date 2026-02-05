import { invalidateUserQuery } from "../hooks/useCurrentUser";
import router from "../router";
import { usePlayerState } from "../store";

const BASE_URL = `${import.meta.env.VITE_SERVER_URI}/v1`;

let refreshPromise: Promise<Response> | null = null;

export const request = async (input: string, init?: RequestInit & { skipRedirect?: boolean }): Promise<Response> => {
  if (!import.meta.env.VITE_SERVER_URI) {
    console.error("env variable VITE_SERVER_URI is not set");
  }

  let { skipRedirect, ...fetchInit } = init || {};
  fetchInit = {
    ...fetchInit,
    credentials: "include",
  };

  const response = await fetch(`${BASE_URL}${input}`, fetchInit);

  if (response.status === 401) {
    console.warn("Auth token expired, trying to refresh");
    if (!refreshPromise) {
      refreshPromise = fetch(`${BASE_URL}/tokens/refresh`, {
        method: "POST",
        credentials: "include",
      })
        .then((res) => {
          if (res.status === 401) {
            console.log("Access token refresh failed");

            const pathname = router.state.location.pathname;

            if (pathname !== "/login" && pathname !== "/register") {
              invalidateUserQuery();

              if (!skipRedirect) {
                console.log("Going to login");
                usePlayerState.getState().player.stop();
                router.navigate("/login");
              }
            }
          }
          return res;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const refreshResponse = await refreshPromise;

    if (refreshResponse.ok) {
      console.log("Refreshed tokens");
      return fetch(`${BASE_URL}${input}`, fetchInit);
    }
  }

  return response;
};
