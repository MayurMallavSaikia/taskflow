import type { Task, User } from "../api/types";

export const alice: User = { id: 1, name: "Alice", email: "alice@example.com" };
export const bob: User = { id: 2, name: "Bob", email: "bob@example.com" };

export function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    projectId: 10,
    title: "Write the README",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    dueDate: null,
    overdue: false,
    assignee: null,
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T10:00:00Z",
    ...overrides,
  };
}
