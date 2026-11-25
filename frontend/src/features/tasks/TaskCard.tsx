import React from "react";
import type { Task, TaskStatus } from "../../api/types";
import { formatDate } from "../../utils/dates";
import { PRIORITY_LABELS, STATUS_LABELS, STATUSES } from "../../utils/taskLabels";

export const TASK_DRAG_TYPE = "application/x-taskflow-task";

interface TaskCardProps {
  task: Task;
  onOpen: (task: Task) => void;
  onStatusChange: (task: Task, status: TaskStatus) => void;
  isUpdating?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onOpen, onStatusChange, isUpdating = false }) => {
  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData(TASK_DRAG_TYPE, JSON.stringify({ id: task.id, status: task.status }));
    event.dataTransfer.effectAllowed = "move";
  };

  const classes = ["card", "task-card", task.overdue ? "task-card-overdue" : "", isUpdating ? "task-card-updating" : ""];

  return (
    <article
      className={classes.join(" ").trim()}
      draggable={!isUpdating}
      onDragStart={handleDragStart}
      aria-label={task.title}
      data-test-id={`task-card-${task.id}`}
    >
      <button type="button" className="task-card-title" onClick={() => onOpen(task)}>
        {task.title}
      </button>
      <div className="task-card-meta">
        <span className={`badge badge-${task.priority.toLowerCase()}`}>{PRIORITY_LABELS[task.priority]}</span>
        {task.dueDate && (
          <span className={task.overdue ? "due-date overdue" : "due-date"}>
            {task.overdue ? "Overdue · " : "Due "}
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
      <div className="task-card-footer">
        <span className="muted small">{task.assignee ? task.assignee.name : "Unassigned"}</span>
        <select
          aria-label={`Status for ${task.title}`}
          value={task.status}
          disabled={isUpdating}
          onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
};
