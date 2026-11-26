/** App path of a task's shareable link; opening it shows the board with the task panel open. */
export function taskPath(projectId: number, taskId: number): string {
  return `/projects/${projectId}/tasks/${taskId}`;
}

/** Full URL to share, e.g. https://taskflow.example.com/projects/1/tasks/42 */
export function taskUrl(projectId: number, taskId: number, origin: string = window.location.origin): string {
  return `${origin}${taskPath(projectId, taskId)}`;
}

