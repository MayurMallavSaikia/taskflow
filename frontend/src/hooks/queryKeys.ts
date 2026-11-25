import type { TaskQuery } from "../api/types";

export const queryKeys = {
  projects: ["projects"] as const,
  project: (projectId: number) => ["projects", projectId] as const,
  summary: (projectId: number) => ["projects", projectId, "summary"] as const,
  tasks: (projectId: number) => ["projects", projectId, "tasks"] as const,
  taskList: (projectId: number, query: TaskQuery) => ["projects", projectId, "tasks", query] as const,
  taskActivity: (taskId: number) => ["tasks", taskId, "activity"] as const,
  users: ["users"] as const,
};
