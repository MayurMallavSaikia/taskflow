import { apiClient } from "@/shared/api/client";
import type { User } from "@/entities/user";
import type { Project, ProjectPayload, ProjectSummary } from "../model/types";

export const projectsApi = {
  /** Projects the current user owns or is a member of. */
  list: (signal?: AbortSignal) => apiClient.get<Project[]>("/api/projects", { signal }).then((r) => r.data),

  get: (projectId: number, signal?: AbortSignal) =>
    apiClient.get<Project>(`/api/projects/${projectId}`, { signal }).then((r) => r.data),

  create: (payload: ProjectPayload) => apiClient.post<Project>("/api/projects", payload).then((r) => r.data),

  summary: (projectId: number, signal?: AbortSignal) =>
    apiClient.get<ProjectSummary>(`/api/projects/${projectId}/summary`, { signal }).then((r) => r.data),

  /** Users who can be assigned this project's tasks (always includes the owner). */
  members: (projectId: number, signal?: AbortSignal) =>
    apiClient.get<User[]>(`/api/projects/${projectId}/members`, { signal }).then((r) => r.data),

  addMember: (projectId: number, userId: number) =>
    apiClient.put<User[]>(`/api/projects/${projectId}/members/${userId}`).then((r) => r.data),

  /** Also unassigns the user from this project's tasks. */
  removeMember: (projectId: number, userId: number) =>
    apiClient.delete<User[]>(`/api/projects/${projectId}/members/${userId}`).then((r) => r.data),
};
