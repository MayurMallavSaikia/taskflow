import { apiClient } from "./client";
import type { Project, ProjectPayload, ProjectSummary } from "./types";

export const projectsApi = {
  list: () => apiClient.get<Project[]>("/api/projects").then((r) => r.data),

  get: (projectId: number) => apiClient.get<Project>(`/api/projects/${projectId}`).then((r) => r.data),

  create: (payload: ProjectPayload) => apiClient.post<Project>("/api/projects", payload).then((r) => r.data),

  summary: (projectId: number) =>
    apiClient.get<ProjectSummary>(`/api/projects/${projectId}/summary`).then((r) => r.data),
};
