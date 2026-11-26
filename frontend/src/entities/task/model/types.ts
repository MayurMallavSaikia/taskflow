import type { User } from "@/entities/user";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type SortDirection = "asc" | "desc";

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  overdue: boolean;
  assignee: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivity {
  id: number;
  action: "CREATED" | "UPDATED" | "STATUS_CHANGED";
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  actor: User;
  createdAt: string;
}

export interface TaskPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string | null;
  assigneeId?: number | null;
}

export interface UpdateTaskPayload extends TaskPayload {
  status: TaskStatus;
}

/** Filters and sorting shared by the task list and board endpoints. */
export interface TaskQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  /** Matches the task title, or the task id when it's a number ("42" or "#42"). */
  q?: string;
  sort?: "dueDate" | "priority" | "createdAt";
  direction?: SortDirection;
  page?: number;
  size?: number;
}

/** One board column as the API returns it: the first N tasks with that status and the total that match. */
export interface BoardColumnResponse {
  tasks: Task[];
  total: number;
}

export interface BoardResponse {
  columns: Record<TaskStatus, BoardColumnResponse>;
}

/** How many tasks to load per column (raised by "Load more"). */
export type BoardLimits = Record<TaskStatus, number>;

