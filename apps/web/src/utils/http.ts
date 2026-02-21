import { invalidateUserQuery } from "../hooks/useCurrentUser";
import router from "../router";
import { usePlayerState } from "../store";

let refreshPromise: Promise<Response> | null = null;

export const request = async (input: string, init?: RequestInit & { skipRedirect?: boolean }): Promise<Response> => {
  let baseUrl = "";
  if (import.meta.env.DEV && window.location.hostname === "localhost") {
    baseUrl = "http://localhost:3003/v1";
  } else {
    baseUrl = `${import.meta.env.VITE_SERVER_URI}/v1`;
  }

  if (!import.meta.env.VITE_SERVER_URI) {
    console.error("env variable VITE_SERVER_URI is not set");
  }

  let { skipRedirect, ...fetchInit } = init || {};
  fetchInit = {
    ...fetchInit,
    credentials: "include",
  };

  const response = await fetch(`${baseUrl}${input}`, fetchInit);

  if (response.status === 401) {
    console.warn("Auth token expired, trying to refresh");
    if (!refreshPromise) {
      refreshPromise = fetch(`${baseUrl}/tokens/refresh`, {
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
      return fetch(`${baseUrl}${input}`, fetchInit);
    }
  }

  return response;
};
