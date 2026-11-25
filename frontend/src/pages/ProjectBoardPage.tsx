import React, { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getErrorMessage } from "../api/errors";
import type { Task, TaskStatus } from "../api/types";
import { Button } from "../components/Button";
import { ErrorMessage } from "../components/ErrorMessage";
import { Modal } from "../components/Modal";
import { Spinner } from "../components/Spinner";
import { filtersFromParams, filtersToParams, filtersToQuery, type BoardFilters } from "../features/tasks/boardFilters";
import { SummaryBar } from "../features/tasks/SummaryBar";
import { TaskActivityList } from "../features/tasks/TaskActivityList";
import { TaskColumn } from "../features/tasks/TaskColumn";
import { TaskFilters } from "../features/tasks/TaskFilters";
import { TaskForm } from "../features/tasks/TaskForm";
import { useProject, useProjectSummary } from "../hooks/useProjects";
import { useUpdateTaskStatus } from "../hooks/useTasks";
import { useUsers } from "../hooks/useUsers";
import { STATUSES } from "../utils/taskLabels";

type EditorState = { mode: "create" } | { mode: "edit"; task: Task } | null;

export const ProjectBoardPage: React.FC = () => {
  const projectId = Number(useParams().projectId);
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const query = useMemo(() => filtersToQuery(filters), [filters]);
  const [editor, setEditor] = useState<EditorState>(null);

  const project = useProject(projectId);
  const summary = useProjectSummary(projectId);
  const users = useUsers();
  const updateStatus = useUpdateTaskStatus(projectId);

  if (project.isPending) return <Spinner label="Loading project…" />;
  if (project.isError) {
    return (
      <section>
        <Link to="/projects">← All projects</Link>
        <ErrorMessage error={project.error} onRetry={() => project.refetch()} />
      </section>
    );
  }

  const moveTask = (taskId: number, from: TaskStatus, to: TaskStatus) => {
    if (from !== to) updateStatus.mutate({ taskId, status: to });
  };

  const closeEditor = () => setEditor(null);

  return (
    <section>
      <Link to="/projects" className="back-link">
        ← All projects
      </Link>
      <div className="page-header">
        <div>
          <h1>{project.data.name}</h1>
          {project.data.description && <p className="muted">{project.data.description}</p>}
        </div>
        <Button onClick={() => setEditor({ mode: "create" })}>New task</Button>
      </div>

      {summary.isPending && <Spinner label="Loading summary…" />}
      {summary.isError && <ErrorMessage error={summary.error} onRetry={() => summary.refetch()} />}
      {summary.data && <SummaryBar summary={summary.data} />}

      {users.isError && (
        <div className="alert alert-error" role="alert">
          Couldn't load team members, so the assignee filter is empty. {getErrorMessage(users.error)}
        </div>
      )}
      <TaskFilters
        filters={filters}
        users={users.data ?? []}
        onChange={(next: BoardFilters) => setSearchParams(filtersToParams(next), { replace: true })}
      />

      {updateStatus.isError && (
        <div className="alert alert-error" role="alert">
          Couldn't move the task: {getErrorMessage(updateStatus.error)}
        </div>
      )}

      <div className="board">
        {STATUSES.map((status) => (
          <TaskColumn
            key={status}
            projectId={projectId}
            status={status}
            query={query}
            count={summary.data?.countsByStatus[status]}
            updatingTaskId={updateStatus.isPending ? updateStatus.variables?.taskId : undefined}
            onOpenTask={(task) => setEditor({ mode: "edit", task })}
            onMoveTask={moveTask}
          />
        ))}
      </div>

      {editor && (
        <Modal title={editor.mode === "edit" ? "Edit task" : "New task"} onClose={closeEditor}>
          <TaskForm
            projectId={projectId}
            users={users.data ?? []}
            task={editor.mode === "edit" ? editor.task : undefined}
            onDone={closeEditor}
          />
          {editor.mode === "edit" && (
            <section className="activity-section">
              <h3>Activity</h3>
              <TaskActivityList taskId={editor.task.id} />
            </section>
          )}
        </Modal>
      )}
    </section>
  );
};
