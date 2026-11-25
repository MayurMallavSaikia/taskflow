export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type SortDirection = "asc" | "desc";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  owner: User;
  createdAt: string;
}

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

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProjectSummary {
  projectId: number;
  total: number;
  countsByStatus: Record<TaskStatus, number>;
  overdue: number;
}

export interface TaskActivity {
  id: number;
  action: "CREATED" | "UPDATED" | "STATUS_CHANGED";
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  actor: User;
  createdAt: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: FieldError[];
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProjectPayload {
  name: string;
  description?: string;
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

export interface TaskQuery {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number;
  sort?: "dueDate" | "priority" | "createdAt";
  direction?: SortDirection;
  page?: number;
  size?: number;
}
