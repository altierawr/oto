import { sleep } from "./utils";
import * as SecureStore from "expo-secure-store";

const fetchWithRateLimitRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  while (true) {
    const response = await fetch(input, init);
    if (response.status !== 429) {
      return response;
    }
    console.log("Rate limited, retrying...");
    await sleep(1000);
  }
};

let refreshPromise: Promise<TokenResponse> | null = null;

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  ok?: boolean;
};

export const refreshAccessToken = (
  baseUrl: string,
  refreshToken: string,
): Promise<TokenResponse> => {
  if (!refreshPromise) {
    refreshPromise = fetchWithRateLimitRetry(`${baseUrl}/tokens/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    })
      .then(async (resp) => {
        if (resp.status === 401) {
          console.log("Access token refresh failed");
        }

        const data = await resp.json();
        return {
          ...data,
          ok: resp.ok,
        } as TokenResponse;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const request = async (
  input: string,
  init?: RequestInit & { skipRedirect?: boolean },
): Promise<Response> => {
  const baseUrl = "http://localhost:3003/v1";

  let { ...fetchInit } = init || {};
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

    const refreshToken = await SecureStore.getItemAsync("refreshToken");
    if (!refreshToken) {
      return response;
    }

    const refreshResponse = await refreshAccessToken(baseUrl, refreshToken);

    if (!refreshResponse.ok) {
      return response;
    }

    console.log("Refreshed tokens");
  }
};
