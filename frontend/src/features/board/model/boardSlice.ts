import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import { toApiError, type ApiError } from "@/shared/api/errors";
import type { RequestStatus } from "@/shared/lib/redux";
import {
  selectTaskEntities,
  STATUSES,
  tasksApi,
  tasksReceived,
  type BoardLimits,
  type Task,
  type TaskQuery,
  type TaskStatus,
  type TasksState,
} from "@/entities/task";

/** A column only stores task ids; the tasks themselves live in the task entity table. */
export interface BoardColumnState {
  ids: number[];
  /** How many tasks with this status match the filters (may be more than are loaded). */
  total: number;
}

export interface BoardState {
  projectId?: number;
  /** Filters + limits of the latest request. */
  requestKey?: string;
  /** Filters + limits the data in `columns` belongs to. */
  loadedKey?: string;
  columns?: Record<TaskStatus, BoardColumnState>;
  status: RequestStatus;
  error?: ApiError;
  /** Only the latest request may update the board; older responses are ignored. */
  latestRequestId?: string;
}

export interface FetchBoardArgs {
  projectId: number;
  query: Omit<TaskQuery, "status" | "page" | "size">;
  limits: BoardLimits;
}

type State = { board: BoardState; tasks: TasksState };

const boardKey = ({ query, limits }: FetchBoardArgs) => JSON.stringify({ query, limits });

const initialState: BoardState = { status: "idle" };

/** Loads all three columns in one request and puts the tasks into the shared task table. */
export const fetchBoard = createAsyncThunk<
  Record<TaskStatus, BoardColumnState>,
  FetchBoardArgs,
  { state: State; rejectValue: ApiError }
>("board/fetch", async ({ projectId, query, limits }, { signal, dispatch, rejectWithValue }) => {
  try {
    const response = await tasksApi.board(projectId, query, limits, signal);
    dispatch(tasksReceived(STATUSES.flatMap((status) => response.columns[status].tasks)));
    return Object.fromEntries(
      STATUSES.map((status) => {
        const column = response.columns[status];
        return [status, { ids: column.tasks.map((t) => t.id), total: column.total }];
      }),
    ) as Record<TaskStatus, BoardColumnState>;
  } catch (error) {
    return rejectWithValue(toApiError(error));
  }
});

export const boardSlice = createSlice({
  name: "board",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoard.pending, (state, { meta }) => {
        if (state.projectId !== meta.arg.projectId) {
          // Different project: never show the previous project's columns.
          state.columns = undefined;
          state.loadedKey = undefined;
        }
        state.projectId = meta.arg.projectId;
        state.requestKey = boardKey(meta.arg);
        state.status = "loading";
        state.error = undefined;
        state.latestRequestId = meta.requestId;
      })
      .addCase(fetchBoard.fulfilled, (state, { payload, meta }) => {
        if (meta.requestId !== state.latestRequestId) return; // superseded by a newer request
        state.columns = payload;
        state.loadedKey = boardKey(meta.arg);
        state.status = "succeeded";
      })
      .addCase(fetchBoard.rejected, (state, { payload, meta }) => {
        if (meta.requestId !== state.latestRequestId) return;
        if (meta.aborted) {
          // Cancelled (e.g. the page unmounted): keep what we had.
          state.status = state.columns ? "succeeded" : "idle";
          return;
        }
        state.status = "failed";
        state.error = payload;
      });
  },
});

// --- Selectors --------------------------------------------------------------------------------

export type BoardColumnView = { tasks: Task[]; total: number };

export const selectBoardState = (state: State) => state.board;

/**
 * The columns with their tasks looked up in the task table. A task whose status no longer
 * matches its column (just moved, refetch pending) is left out, so it doesn't linger there.
 */
export const selectBoardColumns = createSelector(
  [(state: State) => state.board.columns, selectTaskEntities],
  (columns, tasks): Record<TaskStatus, BoardColumnView> | undefined => {
    if (!columns) return undefined;
    return Object.fromEntries(
      STATUSES.map((status) => [
        status,
        {
          tasks: columns[status].ids
            .map((id) => tasks[id])
            .filter((task): task is Task => task !== undefined && task.status === status),
          total: columns[status].total,
        },
      ]),
    ) as Record<TaskStatus, BoardColumnView>;
  },
);

/** True while new filters/limits load and the board still shows the previous result. */
export const selectBoardIsStale = (state: State) =>
  state.board.status === "loading" && state.board.columns !== undefined && state.board.loadedKey !== state.board.requestKey;

