import axios from "axios";
import { API_BASE_URL } from "@/shared/config/appEnv";

/**
 * The one HTTP client for the app. It knows nothing about auth state: the app layer plugs in
 * where the token comes from and what to do on a 401 (see app/store.ts), so this stays at the
 * bottom of the dependency graph.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function setAuthTokenProvider(provider: () => string | null) {
  getToken = provider;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from login/register just means wrong credentials, not an expired session.
    const isAuthCall = error.config?.url?.startsWith("/api/auth/");
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isAuthCall) {
      onUnauthorized();
    }
    return Promise.reject(error);
  },
);
