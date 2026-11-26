import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getErrorMessage } from "@/shared/api/errors";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { useAsyncAction } from "@/shared/lib/useAsyncAction";
import { Button } from "@/shared/ui/Button";
import { ErrorMessage } from "@/shared/ui/ErrorMessage";
import { Modal } from "@/shared/ui/Modal";
import { Spinner } from "@/shared/ui/Spinner";
import {
  fetchProject,
  fetchProjectMembers,
  fetchProjectSummary,
  selectProjectById,
  selectProjectDetailState,
  selectProjectMembers,
  selectProjectSummary,
} from "@/entities/project";
import {
  selectTaskRevision,
  STATUSES,
  taskPath,
  updateTaskStatus,
  type BoardLimits,
  type Task,
  type TaskStatus,
} from "@/entities/task";
import { selectCurrentUser } from "@/features/auth";
import {
  fetchBoard,
  filtersFromParams,
  filtersToParams,
  filtersToQuery,
  selectBoardColumns,
  selectBoardIsStale,
  selectBoardState,
  SummaryBar,
  TaskColumn,
  TaskFilters,
  type BoardFilters,
} from "@/features/board";
import { ProjectMembers } from "@/features/project-members";
import { TaskForm, TaskPanel } from "@/features/task-editor";

/** Tasks loaded per column at first, and added by each "Load more". */
const BOARD_PAGE_SIZE = 20;
const DEFAULT_LIMITS: BoardLimits = { TODO: BOARD_PAGE_SIZE, IN_PROGRESS: BOARD_PAGE_SIZE, DONE: BOARD_PAGE_SIZE };

/** Set when a task is opened from the board, so closing it can go "back" instead of adding history. */
interface BoardLocationState {
  openedFromBoard?: boolean;
}

export const ProjectBoardPage: React.FC = () => {
  const params = useParams();
  const projectId = Number(params.projectId);
  // /projects/:projectId/tasks/:taskId opens that task's panel (shareable link).
  const openTaskId = params.taskId !== undefined && /^\d+$/.test(params.taskId) ? Number(params.taskId) : undefined;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // Filters live in the URL (shareable), not in Redux.
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const query = useMemo(() => filtersToQuery(filters), [filters]);
  const [creating, setCreating] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // Per-column "Load more" limits belong to the current filters: when the filters change, every
  // column goes back to the default (derived here instead of reset in an effect, so we don't fire
  // one request with the old limits and another with the new ones).
  const filterKey = JSON.stringify(query);
  const [loadMore, setLoadMore] = useState<{ filterKey: string; limits: BoardLimits; last?: TaskStatus }>({
    filterKey,
    limits: DEFAULT_LIMITS,
  });
  const currentLoadMore = loadMore.filterKey === filterKey ? loadMore : undefined;
  const limits = currentLoadMore?.limits ?? DEFAULT_LIMITS;
  const showMore = (status: TaskStatus) =>
    setLoadMore({ filterKey, limits: { ...limits, [status]: limits[status] + BOARD_PAGE_SIZE }, last: status });

  const project = useAppSelector(selectProjectById(projectId));
  const projectRequest = useAppSelector(selectProjectDetailState(projectId));
  const summary = useAppSelector(selectProjectSummary(projectId));
  const members = useAppSelector(selectProjectMembers(projectId));
  const currentUser = useAppSelector(selectCurrentUser);
  const board = useAppSelector(selectBoardState);
  const columns = useAppSelector(selectBoardColumns);
  const boardIsStale = useAppSelector(selectBoardIsStale);
  // Bumped whenever this project's tasks change; the board and summary refetch when it does.
  const revision = useAppSelector(selectTaskRevision(projectId));

  useEffect(() => {
    dispatch(fetchProject(projectId));
    // Only members can be assigned, so they're the assignee list for the filter and the form.
    dispatch(fetchProjectMembers(projectId));
  }, [dispatch, projectId]);

  useEffect(() => {
    const pending = dispatch(fetchProjectSummary(projectId));
    return () => pending.abort();
  }, [dispatch, projectId, revision]);

  // All three columns in one request. A newer request (filters typed, "Load more", a task change)
  // cancels the previous one.
  useEffect(() => {
    const pending = dispatch(fetchBoard({ projectId, query, limits }));
    return () => pending.abort();
  }, [dispatch, projectId, query, limits, revision]);

  const move = useAsyncAction((taskId: number, status: TaskStatus) =>
    dispatch(updateTaskStatus({ taskId, status })).unwrap(),
  );
  const [movingTaskId, setMovingTaskId] = useState<number>();

  if (!project) {
    if (projectRequest.status === "failed") {
      return (
        <section>
          <Link to="/projects">← All projects</Link>
          <ErrorMessage error={projectRequest.error} onRetry={() => dispatch(fetchProject(projectId))} />
        </section>
      );
    }
    return <Spinner label="Loading project…" />;
  }

  const moveTask = async (taskId: number, from: TaskStatus, to: TaskStatus) => {
    if (from === to) return;
    setMovingTaskId(taskId);
    await move.run(taskId, to);
    setMovingTaskId(undefined);
  };

  /** Opening a task changes the URL to its shareable link (keeping the board's filters). */
  const openTask = (task: Task) => {
    const state: BoardLocationState = { openedFromBoard: true };
    navigate({ pathname: taskPath(projectId, task.id), search: location.search }, { state });
  };

  const closeTask = () => {
    if ((location.state as BoardLocationState | null)?.openedFromBoard) {
      navigate(-1); // back to the board entry we came from
    } else {
      // Opened from a shared link: replace it with the plain board.
      navigate({ pathname: `/projects/${projectId}`, search: location.search }, { replace: true });
    }
  };

  const memberList = members.data ?? [];

  return (
    <section>
      <Link to="/projects" className="back-link">
        ← All projects
      </Link>
      <div className="page-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <div className="page-header-actions">
          <Button variant="secondary" onClick={() => setShowMembers(true)}>
            Members{members.data ? ` (${members.data.length})` : ""}
          </Button>
          <Button onClick={() => setCreating(true)}>New task</Button>
        </div>
      </div>

      {!summary.data && summary.status === "loading" && <Spinner label="Loading summary…" />}
      {summary.status === "failed" && (
        <ErrorMessage error={summary.error} onRetry={() => dispatch(fetchProjectSummary(projectId))} />
      )}
      {summary.data && <SummaryBar summary={summary.data} />}

      {members.status === "failed" && (
        <div className="alert alert-error" role="alert">
          Couldn't load project members, so the assignee lists are empty. {getErrorMessage(members.error)}
        </div>
      )}
      <TaskFilters
        filters={filters}
        users={memberList}
        onChange={(next: BoardFilters) => setSearchParams(filtersToParams(next), { replace: true })}
      />

      {move.error && (
        <div className="alert alert-error" role="alert">
          Couldn't move the task: {getErrorMessage(move.error)}
        </div>
      )}

      {board.status === "failed" && (
        <ErrorMessage error={board.error} onRetry={() => dispatch(fetchBoard({ projectId, query, limits }))} />
      )}

      {/* While new filters load, the previous board stays visible (dimmed) instead of flashing spinners. */}
      <div className={`board${boardIsStale ? " board-refreshing" : ""}`} aria-busy={board.status === "loading"}>
        {STATUSES.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            column={board.projectId === projectId ? columns?.[status] : undefined}
            count={summary.data?.countsByStatus[status]}
            updatingTaskId={movingTaskId}
            isLoadingMore={boardIsStale && currentLoadMore?.last === status}
            onLoadMore={() => showMore(status)}
            onOpenTask={openTask}
            onMoveTask={moveTask}
          />
        ))}
      </div>

      {creating && (
        <Modal title="New task" onClose={() => setCreating(false)}>
          <TaskForm projectId={projectId} users={memberList} onDone={() => setCreating(false)} />
        </Modal>
      )}

      {openTaskId !== undefined && (
        <TaskPanel projectId={projectId} taskId={openTaskId} users={memberList} onClose={closeTask} />
      )}

      {showMembers && (
        <Modal title="Project members" onClose={() => setShowMembers(false)}>
          <ProjectMembers projectId={projectId} owner={project.owner} currentUserId={currentUser?.id} />
        </Modal>
      )}
    </section>
  );
};

