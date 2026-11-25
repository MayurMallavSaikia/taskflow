import React from "react";
import type { TaskActivity } from "../../api/types";
import { ErrorMessage } from "../../components/ErrorMessage";
import { Spinner } from "../../components/Spinner";
import { useTaskActivity } from "../../hooks/useTasks";
import { formatDateTime } from "../../utils/dates";
import { STATUS_LABELS } from "../../utils/taskLabels";

function describe(activity: TaskActivity): string {
  switch (activity.action) {
    case "CREATED":
      return "created the task";
    case "UPDATED":
      return "edited the task";
    case "STATUS_CHANGED":
      return `moved it from ${activity.fromStatus ? STATUS_LABELS[activity.fromStatus] : "?"} to ${
        activity.toStatus ? STATUS_LABELS[activity.toStatus] : "?"
      }`;
  }
}

export const TaskActivityList: React.FC<{ taskId: number }> = ({ taskId }) => {
  const { data, isPending, isError, error, refetch } = useTaskActivity(taskId);

  if (isPending) return <Spinner label="Loading activity…" />;
  if (isError) return <ErrorMessage error={error} onRetry={() => refetch()} />;
  if (data.length === 0) return <p className="muted small">No activity yet.</p>;

  return (
    <ol className="activity-list">
      {data.map((activity) => (
        <li key={activity.id}>
          <strong>{activity.actor.name}</strong> {describe(activity)}
          <span className="muted small"> · {formatDateTime(activity.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
};
