import { apiClient } from "@/shared/api/client";
import type { User } from "../model/types";

export const usersApi = {
  /** All users; used to pick new project members. */
  list: (signal?: AbortSignal) => apiClient.get<User[]>("/api/users", { signal }).then((r) => r.data),
};

