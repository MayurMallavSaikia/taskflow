import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { ErrorMessage } from "@/shared/ui/ErrorMessage";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import { fetchTask, selectTaskById, selectTaskDetailState, selectTaskRevision, taskPath } from "@/entities/task";
import type { User } from "@/entities/user";
import { CopyTaskLink } from "./CopyTaskLink";
import { TaskActivityList } from "./TaskActivityList";
import { TaskForm } from "./TaskForm";

interface TaskPanelProps {
  projectId: number;
  taskId: number;
  users: User[];
  onClose: () => void;
}

/**
 * The task detail panel, driven by the URL (/projects/:projectId/tasks/:taskId) so it can be
 * opened from a shared link. Shows the cached task right away (e.g. from the board) and
 * refreshes it from the server.
 */
export const TaskPanel: React.FC<TaskPanelProps> = ({ projectId, taskId, users, onClose }) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const task = useAppSelector(selectTaskById(taskId));
  const request = useAppSelector(selectTaskDetailState(taskId));
  const revision = useAppSelector(selectTaskRevision(projectId));

  useEffect(() => {
    const pending = dispatch(fetchTask(taskId));
    return () => pending.abort();
  }, [dispatch, taskId, revision]);

  const renderBody = () => {
    if (request.status === "failed" && request.error?.status === 404) {
      return (
        <div className="alert alert-error" role="alert">
          Task #{taskId} doesn't exist, or you don't have access to it.
        </div>
      );
    }
    if (!task) {
      if (request.status === "failed") {
        return <ErrorMessage error={request.error} onRetry={() => dispatch(fetchTask(taskId))} />;
      }
      return <Spinner label="Loading task…" />;
    }

    // A link with the wrong project in it (e.g. hand-edited): go to the task's real board.
    if (task.projectId !== projectId) {
      return <Navigate to={{ pathname: taskPath(task.projectId, taskId), search: location.search }} replace />;
    }

    return (
      <>
        <div className="task-panel-toolbar">
          <span className="task-id">#{task.id}</span>
          <CopyTaskLink projectId={projectId} taskId={task.id} />
        </div>
        {/* key: start a fresh form if another task is opened while the panel is still mounted */}
        <TaskForm key={task.id} projectId={projectId} users={users} task={task} onDone={onClose} />
        <section className="activity-section">
          <h3>Activity</h3>
          <TaskActivityList projectId={projectId} taskId={task.id} />
        </section>
      </>
    );
  };

  return (
    <Modal title={task ? `Edit task #${task.id}` : `Task #${taskId}`} onClose={onClose}>
      {renderBody()}
    </Modal>
  );
};


