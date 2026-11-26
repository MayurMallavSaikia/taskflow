import type { TaskStatus } from "@/entities/task";
import type { User } from "@/entities/user";

export interface Project {
  id: number;
  name: string;
  description: string | null;
  owner: User;
  createdAt: string;
}

export interface ProjectPayload {
  name: string;
  description?: string;
}

/** Unfiltered task counts for a project. */
export interface ProjectSummary {
  projectId: number;
  total: number;
  countsByStatus: Record<TaskStatus, number>;
  overdue: number;
}
