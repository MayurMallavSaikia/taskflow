import { createAsyncThunk, createEntityAdapter, createSlice, type EntityState, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiError } from "@/shared/api/errors";
import {
  callApi,
  IDLE,
  requestFailed,
  requestPending,
  type AsyncData,
  type RequestState,
} from "@/shared/lib/redux";
import { tasksApi } from "../api/tasksApi";
import type { Task, TaskActivity, TaskPayload, TaskStatus, UpdateTaskPayload } from "./types";

/** Every task we've seen (from the board, a link, or a save) is stored once, by id. */
const tasksAdapter = createEntityAdapter<Task>();

export interface TasksState {
  entities: EntityState<Task, number>;
  /** Status of fetching a single task (e.g. one opened from a shared link). */
  detail: Record<number, RequestState>;
  activity: Record<number, AsyncData<TaskActivity[]>>;
  /**
   * Bumped whenever a project's tasks change (create, edit, move, delete, member removed).
   * Views that show derived data (board columns, summary, activity) refetch when it changes:
   * that's this app's cache invalidation.
   */
  revisionByProject: Record<number, number>;
}

type State = { tasks: TasksState };
type ThunkConfig = { state: State; rejectValue: ApiError };

const initialState: TasksState = {
  entities: tasksAdapter.getInitialState(),
  detail: {},
  activity: {},
  revisionByProject: {},
};

// --- Thunks -----------------------------------------------------------------------------------

export const fetchTask = createAsyncThunk<Task, number, ThunkConfig>(
  "tasks/fetchOne",
  (taskId, { signal, rejectWithValue }) => callApi(() => tasksApi.get(taskId, signal), rejectWithValue),
);

export const fetchTaskActivity = createAsyncThunk<TaskActivity[], number, ThunkConfig>(
  "tasks/fetchActivity",
  (taskId, { signal, rejectWithValue }) => callApi(() => tasksApi.activity(taskId, signal), rejectWithValue),
);

export const createTask = createAsyncThunk<Task, { projectId: number; payload: TaskPayload }, ThunkConfig>(
  "tasks/create",
  ({ projectId, payload }, { rejectWithValue }) => callApi(() => tasksApi.create(projectId, payload), rejectWithValue),
);

export const updateTask = createAsyncThunk<Task, { taskId: number; payload: UpdateTaskPayload }, ThunkConfig>(
  "tasks/update",
  ({ taskId, payload }, { rejectWithValue }) => callApi(() => tasksApi.update(taskId, payload), rejectWithValue),
);

export const updateTaskStatus = createAsyncThunk<Task, { taskId: number; status: TaskStatus }, ThunkConfig>(
  "tasks/updateStatus",
  ({ taskId, status }, { rejectWithValue }) => callApi(() => tasksApi.updateStatus(taskId, status), rejectWithValue),
);

export const deleteTask = createAsyncThunk<void, { taskId: number; projectId: number }, ThunkConfig>(
  "tasks/delete",
  ({ taskId }, { rejectWithValue }) => callApi(() => tasksApi.remove(taskId), rejectWithValue),
);

// --- Slice ------------------------------------------------------------------------------------

function bumpRevision(state: TasksState, projectId: number) {
  state.revisionByProject[projectId] = (state.revisionByProject[projectId] ?? 0) + 1;
}

function taskSaved(state: TasksState, { payload }: PayloadAction<Task>) {
  tasksAdapter.upsertOne(state.entities, payload);
  bumpRevision(state, payload.projectId);
}

export const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    /** Tasks loaded elsewhere (e.g. the board) go into the shared table too. */
    tasksReceived(state, action: PayloadAction<Task[]>) {
      tasksAdapter.upsertMany(state.entities, action.payload);
    },
    /** Something changed a project's tasks on the server without going through this slice. */
    taskDataChanged(state, action: PayloadAction<number>) {
      bumpRevision(state, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTask.pending, (state, { meta }) => {
        state.detail[meta.arg] ??= { status: "idle" };
        requestPending(state.detail[meta.arg], meta.requestId);
      })
      .addCase(fetchTask.fulfilled, (state, { payload, meta }) => {
        tasksAdapter.upsertOne(state.entities, payload);
        state.detail[meta.arg] = { status: "succeeded" };
      })
      .addCase(fetchTask.rejected, (state, action) => {
        requestFailed(state.detail[action.meta.arg], action);
        // Gone (deleted, or no access any more): don't keep showing a stale copy.
        if (action.payload?.status === 404) tasksAdapter.removeOne(state.entities, action.meta.arg);
      })

      .addCase(fetchTaskActivity.pending, (state, { meta }) => {
        state.activity[meta.arg] ??= { status: "idle" };
        requestPending(state.activity[meta.arg], meta.requestId);
      })
      .addCase(fetchTaskActivity.fulfilled, (state, { payload, meta }) => {
        state.activity[meta.arg] = { status: "succeeded", data: payload };
      })
      .addCase(fetchTaskActivity.rejected, (state, action) =>
        requestFailed(state.activity[action.meta.arg], action),
      )

      .addCase(createTask.fulfilled, taskSaved)
      .addCase(updateTask.fulfilled, taskSaved)
      .addCase(updateTaskStatus.fulfilled, taskSaved)
      // A failed move may still have changed things (e.g. someone else moved it): refresh anyway.
      .addCase(updateTaskStatus.rejected, (state, { meta }) => {
        const projectId = state.entities.entities[meta.arg.taskId]?.projectId;
        if (projectId !== undefined) bumpRevision(state, projectId);
      })

      .addCase(deleteTask.fulfilled, (state, { meta }) => {
        tasksAdapter.removeOne(state.entities, meta.arg.taskId);
        delete state.detail[meta.arg.taskId];
        delete state.activity[meta.arg.taskId];
        bumpRevision(state, meta.arg.projectId);
      });
  },
});

export const { tasksReceived, taskDataChanged } = tasksSlice.actions;

// --- Selectors --------------------------------------------------------------------------------
// Selectors that need an id are curried, e.g. useAppSelector(selectTaskById(taskId)), so the
// state type is inferred without the store's RootState (which lower layers can't import).

const IDLE_DATA: AsyncData<never> = IDLE;

export const selectTaskEntities = (state: State) => state.tasks.entities.entities;
export const selectTaskById =
  (taskId: number) =>
  (state: State): Task | undefined =>
    state.tasks.entities.entities[taskId];
export const selectTaskDetailState =
  (taskId: number) =>
  (state: State): RequestState =>
    state.tasks.detail[taskId] ?? IDLE;
export const selectTaskActivity =
  (taskId: number) =>
  (state: State): AsyncData<TaskActivity[]> =>
    state.tasks.activity[taskId] ?? IDLE_DATA;
export const selectTaskRevision =
  (projectId: number) =>
  (state: State): number =>
    state.tasks.revisionByProject[projectId] ?? 0;


