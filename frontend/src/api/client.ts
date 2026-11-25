import axios from "axios";
import { API_BASE_URL } from "../appEnv";
import { tokenStorage } from "../utils/tokenStorage";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/**
 * Lets the AuthProvider react to a 401 (e.g. an expired token) without the API layer
 * importing React code.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith("/api/auth/");
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isAuthCall) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);
