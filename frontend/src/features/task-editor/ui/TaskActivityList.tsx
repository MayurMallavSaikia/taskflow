import React, { useEffect } from "react";
import { formatDateTime } from "@/shared/lib/dates";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { ErrorMessage } from "@/shared/ui/ErrorMessage";
import { Spinner } from "@/shared/ui/Spinner";
import {
  fetchTaskActivity,
  selectTaskActivity,
  selectTaskRevision,
  STATUS_LABELS,
  type TaskActivity,
} from "@/entities/task";

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

export const TaskActivityList: React.FC<{ projectId: number; taskId: number }> = ({ projectId, taskId }) => {
  const dispatch = useAppDispatch();
  const activity = useAppSelector(selectTaskActivity(taskId));
  // Refetch whenever the project's tasks change (e.g. this task was just edited).
  const revision = useAppSelector(selectTaskRevision(projectId));

  useEffect(() => {
    const request = dispatch(fetchTaskActivity(taskId));
    return () => request.abort();
  }, [dispatch, taskId, revision]);

  if (!activity.data) {
    if (activity.status === "failed") {
      return <ErrorMessage error={activity.error} onRetry={() => dispatch(fetchTaskActivity(taskId))} />;
    }
    return <Spinner label="Loading activity…" />;
  }
  if (activity.data.length === 0) return <p className="muted small">No activity yet.</p>;

  return (
    <ol className="activity-list">
      {activity.data.map((entry) => (
        <li key={entry.id}>
          <strong>{entry.actor.name}</strong> {describe(entry)}
          <span className="muted small">  {formatDateTime(entry.createdAt)}</span>
        </li>
      ))}
    </ol>
  );
};


