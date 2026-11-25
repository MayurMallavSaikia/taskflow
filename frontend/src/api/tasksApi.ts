import { apiClient } from "./client";
import type { Page, Task, TaskActivity, TaskPayload, TaskQuery, TaskStatus, UpdateTaskPayload } from "./types";

export const tasksApi = {
  list: (projectId: number, query: TaskQuery) =>
    apiClient.get<Page<Task>>(`/api/projects/${projectId}/tasks`, { params: query }).then((r) => r.data),

  create: (projectId: number, payload: TaskPayload) =>
    apiClient.post<Task>(`/api/projects/${projectId}/tasks`, payload).then((r) => r.data),

  update: (taskId: number, payload: UpdateTaskPayload) =>
    apiClient.put<Task>(`/api/tasks/${taskId}`, payload).then((r) => r.data),

  updateStatus: (taskId: number, status: TaskStatus) =>
    apiClient.patch<Task>(`/api/tasks/${taskId}/status`, { status }).then((r) => r.data),

  remove: (taskId: number) => apiClient.delete<void>(`/api/tasks/${taskId}`),

  activity: (taskId: number) =>
    apiClient.get<TaskActivity[]>(`/api/tasks/${taskId}/activity`).then((r) => r.data),
};
