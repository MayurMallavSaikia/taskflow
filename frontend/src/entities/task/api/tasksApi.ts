import { apiClient } from "@/shared/api/client";
import type { Page } from "@/shared/api/types";
import type {
  BoardLimits,
  BoardResponse,
  Task,
  TaskActivity,
  TaskPayload,
  TaskQuery,
  TaskStatus,
  UpdateTaskPayload,
} from "../model/types";

export const tasksApi = {
  list: (projectId: number, query: TaskQuery, signal?: AbortSignal) =>
    apiClient.get<Page<Task>>(`/api/projects/${projectId}/tasks`, { params: query, signal }).then((r) => r.data),

  /** Every board column in a single request. `signal` lets a newer search cancel this one. */
  board: (
    projectId: number,
    query: Omit<TaskQuery, "status" | "page" | "size">,
    limits: BoardLimits,
    signal?: AbortSignal,
  ) =>
    apiClient
      .get<BoardResponse>(`/api/projects/${projectId}/board`, {
        params: {
          ...query,
          todoLimit: limits.TODO,
          inProgressLimit: limits.IN_PROGRESS,
          doneLimit: limits.DONE,
        },
        signal,
      })
      .then((r) => r.data),

  get: (taskId: number, signal?: AbortSignal) =>
    apiClient.get<Task>(`/api/tasks/${taskId}`, { signal }).then((r) => r.data),

  create: (projectId: number, payload: TaskPayload) =>
    apiClient.post<Task>(`/api/projects/${projectId}/tasks`, payload).then((r) => r.data),

  update: (taskId: number, payload: UpdateTaskPayload) =>
    apiClient.put<Task>(`/api/tasks/${taskId}`, payload).then((r) => r.data),

  updateStatus: (taskId: number, status: TaskStatus) =>
    apiClient.patch<Task>(`/api/tasks/${taskId}/status`, { status }).then((r) => r.data),

  remove: (taskId: number) => apiClient.delete<void>(`/api/tasks/${taskId}`).then(() => undefined),

  activity: (taskId: number, signal?: AbortSignal) =>
    apiClient.get<TaskActivity[]>(`/api/tasks/${taskId}/activity`, { signal }).then((r) => r.data),
};

