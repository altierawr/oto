import router from "../router";
import { usePlayerState } from "../store";

const BASE_URL = "http://localhost:3003/v1";

let refreshPromise: Promise<Response> | null = null;

export const request = async (
  input: string,
  init?: RequestInit & { skipRedirect?: boolean },
): Promise<Response> => {
  const { skipRedirect, ...fetchInit } = init || {};
  const response = await fetch(`${BASE_URL}${input}`, fetchInit);

  if (response.status === 401 && !skipRedirect) {
    console.warn("Auth token expired, trying to refresh");
    if (!refreshPromise) {
      refreshPromise = fetch(`${BASE_URL}/tokens/refresh`, {
        method: "POST",
        credentials: "include",
      })
        .then((res) => {
          if (res.status === 401) {
            console.log("Refresh failed, going to login");
            usePlayerState.getState().player.stop();
            router.navigate("/login");
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
