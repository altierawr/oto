import { invalidateUserQuery } from "../hooks/useCurrentUser";
import router from "../router";
import { usePlayerState } from "../store";
import { sleep } from "./utils";

let refreshPromise: Promise<Response> | null = null;

const fetchWithRateLimitRetry = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  while (true) {
    const response = await fetch(input, init);
    if (response.status !== 429) {
      return response;
    }
    console.log("Rate limited, retrying...");
    await sleep(1000);
  }
};

const refreshAccessToken = (baseUrl: string, skipRedirect?: boolean): Promise<Response> => {
  if (!refreshPromise) {
    refreshPromise = fetchWithRateLimitRetry(`${baseUrl}/tokens/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (response.status === 401) {
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
        return response;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

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

  while (true) {
    const response = await fetchWithRateLimitRetry(`${baseUrl}${input}`, fetchInit);

    if (response.status !== 401) {
      return response;
    }

    console.warn("Auth token expired, trying to refresh");
    const refreshResponse = await refreshAccessToken(baseUrl, skipRedirect);

    if (!refreshResponse.ok) {
      return response;
    }

    console.log("Refreshed tokens");
  }
};
