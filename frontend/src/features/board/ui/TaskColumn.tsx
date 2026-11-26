import React, { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Spinner";
import { STATUS_LABELS, TASK_DRAG_TYPE, TaskCard, type Task, type TaskStatus } from "@/entities/task";
import type { BoardColumnView } from "../model/boardSlice";

interface TaskColumnProps {
  status: TaskStatus;
  /** This column's slice of the board; undefined while the board is loading for the first time. */
  column?: BoardColumnView;
  /** Unfiltered count for the status (from the summary), to show "x of y" when filtering. */
  count?: number;
  updatingTaskId?: number;
  isLoadingMore?: boolean;
  onLoadMore: () => void;
  onOpenTask: (task: Task) => void;
  onMoveTask: (taskId: number, from: TaskStatus, to: TaskStatus) => void;
}

/** One board column. Presentational: the board loads all columns in a single request. */
export const TaskColumn: React.FC<TaskColumnProps> = ({
  status,
  column,
  count,
  updatingTaskId,
  isLoadingMore = false,
  onLoadMore,
  onOpenTask,
  onMoveTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const tasks = column?.tasks ?? [];
  const filteredTotal = column?.total;

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const raw = event.dataTransfer.getData(TASK_DRAG_TYPE);
    if (!raw) return;
    const dragged = JSON.parse(raw) as { id: number; status: TaskStatus };
    if (dragged.status !== status) onMoveTask(dragged.id, dragged.status, status);
  };

  const renderBody = () => {
    if (!column) return <Spinner />;
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
        {tasks.length < column.total && (
          <Button variant="ghost" loading={isLoadingMore} onClick={onLoadMore}>
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

