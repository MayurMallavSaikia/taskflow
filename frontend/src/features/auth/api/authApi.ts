import { apiClient } from "@/shared/api/client";
import type { User } from "@/entities/user";

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiClient.post<AuthResponse>("/api/auth/register", payload).then((r) => r.data),

  login: (payload: LoginPayload) => apiClient.post<AuthResponse>("/api/auth/login", payload).then((r) => r.data),

  /** Logs in as the shared demo account (no password needed on the client). */
  guest: () => apiClient.post<AuthResponse>("/api/auth/guest").then((r) => r.data),
};

