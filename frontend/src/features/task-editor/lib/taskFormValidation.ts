import type { TaskPriority, TaskStatus } from "@/entities/task";

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
}

export const TITLE_MAX_LENGTH = 120;

/**
 * Mirrors the backend rules so users get instant feedback. The backend is still the source of truth.
 * A past due date is only rejected when it's new or changed, so old overdue tasks can still be edited.
 */
export function validateTaskForm(
  values: TaskFormValues,
  today: string,
  originalDueDate: string | null = null,
): Partial<Record<keyof TaskFormValues, string>> {
  const errors: Partial<Record<keyof TaskFormValues, string>> = {};
  const title = values.title.trim();
  if (!title) errors.title = "Title is required";
  else if (title.length > TITLE_MAX_LENGTH) errors.title = `Title must be at most ${TITLE_MAX_LENGTH} characters`;

  if (values.description.length > 2000) errors.description = "Description must be at most 2000 characters";

  // yyyy-mm-dd strings compare correctly as plain strings.
  if (values.dueDate && values.dueDate !== originalDueDate && values.dueDate < today) {
    errors.dueDate = "Due date cannot be in the past";
  }
  return errors;
}
