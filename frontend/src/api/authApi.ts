import { apiClient } from "./client";
import type { AuthResponse, LoginPayload, RegisterPayload } from "./types";

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>("/api/auth/register", payload).then((r) => r.data),

  login: (payload: LoginPayload) => apiClient.post<AuthResponse>("/api/auth/login", payload).then((r) => r.data),
};
