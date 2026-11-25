import React, { useState } from "react";
import type { Task, TaskQuery, TaskStatus } from "../../api/types";
import { Button } from "../../components/Button";
import { ErrorMessage } from "../../components/ErrorMessage";
import { Spinner } from "../../components/Spinner";
import { useColumnTasks } from "../../hooks/useTasks";
import { STATUS_LABELS } from "../../utils/taskLabels";
import { TASK_DRAG_TYPE, TaskCard } from "./TaskCard";

interface TaskColumnProps {
  projectId: number;
  status: TaskStatus;
  query: TaskQuery;
  count?: number;
  updatingTaskId?: number;
  onOpenTask: (task: Task) => void;
  onMoveTask: (taskId: number, from: TaskStatus, to: TaskStatus) => void;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
  projectId,
  status,
  query,
  count,
  updatingTaskId,
  onOpenTask,
  onMoveTask,
}) => {
  const { data, isPending, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useColumnTasks(
    projectId,
    { ...query, status },
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const tasks = data?.pages.flatMap((page) => page.content) ?? [];
  const filteredTotal = data?.pages[0]?.totalElements;

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const raw = event.dataTransfer.getData(TASK_DRAG_TYPE);
    if (!raw) return;
    const dragged = JSON.parse(raw) as { id: number; status: TaskStatus };
    if (dragged.status !== status) onMoveTask(dragged.id, dragged.status, status);
  };

  const renderBody = () => {
    if (isPending) return <Spinner />;
    if (isError) return <ErrorMessage error={error} onRetry={() => refetch()} />;
    if (tasks.length === 0) return <p className="column-empty muted">No tasks</p>;
    return (
      <>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onOpen={onOpenTask}
            onStatusChange={(t, next) => onMoveTask(t.id, t.status, next)}
            isUpdating={task.id === updatingTaskId}
          />
        ))}
        {hasNextPage && (
          <Button variant="ghost" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
            Load more
          </Button>
        )}
      </>
    );
  };

  return (
    <section
      className={`board-column${isDragOver ? " board-column-drag-over" : ""}`}
      aria-label={STATUS_LABELS[status]}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes(TASK_DRAG_TYPE)) {
          event.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <header className="board-column-header">
        <h2>{STATUS_LABELS[status]}</h2>
        <span className="count-pill">
          {filteredTotal !== undefined && count !== undefined && filteredTotal !== count
            ? `${filteredTotal} of ${count}`
            : (count ?? filteredTotal ?? "–")}
        </span>
      </header>
      <div className="board-column-body">{renderBody()}</div>
    </section>
  );
};
