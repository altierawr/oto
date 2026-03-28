import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { refreshAccessToken } from "@/utils/http";
import { isTokenExpired } from "@/utils/tokens";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
};

export function useAuthState(): AuthState {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const accessToken = await SecureStore.getItemAsync("accessToken");
        const refreshToken = await SecureStore.getItemAsync("refreshToken");

        if (!refreshToken) {
          setIsLoggedIn(false);
          return;
        }

        if (accessToken && !isTokenExpired(accessToken)) {
          setIsLoggedIn(true);
          return;
        }

        // Access token missing or expired — try to refresh
        const baseUrl = "http://localhost:3003/v1";
        const tokens = await refreshAccessToken(baseUrl, refreshToken);
        if (!tokens.ok) {
          await SecureStore.deleteItemAsync("accessToken");
          await SecureStore.deleteItemAsync("refreshToken");
          setIsLoggedIn(false);
        } else {
          await SecureStore.setItemAsync("accessToken", tokens.accessToken);
          await SecureStore.setItemAsync("refreshToken", tokens.refreshToken);
          setIsLoggedIn(true);
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  return { isLoggedIn, isLoading };
}
