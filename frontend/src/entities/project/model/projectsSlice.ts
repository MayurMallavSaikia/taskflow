import { createAsyncThunk, createEntityAdapter, createSelector, createSlice, type EntityState } from "@reduxjs/toolkit";
import { toApiError, type ApiError } from "@/shared/api/errors";
import { IDLE, requestFailed, requestPending, type AsyncData, type RequestState } from "@/shared/lib/redux";
import type { User } from "@/entities/user";
import { projectsApi } from "../api/projectsApi";
import type { Project, ProjectPayload, ProjectSummary } from "./types";

/** Each project is stored once, by id; the list just keeps the order the server returned. */
const projectsAdapter = createEntityAdapter<Project>();

export interface ProjectsState {
  entities: EntityState<Project, number>;
  list: RequestState & { ids: number[] };
  detail: Record<number, RequestState>;
  summaries: Record<number, AsyncData<ProjectSummary>>;
  members: Record<number, AsyncData<User[]>>;
}

type State = { projects: ProjectsState };
type ThunkConfig = { state: State; rejectValue: ApiError };

const initialState: ProjectsState = {
  entities: projectsAdapter.getInitialState(),
  list: { status: "idle", ids: [] },
  detail: {},
  summaries: {},
  members: {},
};

/** Wraps an API call so failures reject with a serializable ApiError. */
async function call<T>(request: () => Promise<T>, rejectWithValue: (error: ApiError) => unknown) {
  try {
    return await request();
  } catch (error) {
    return rejectWithValue(toApiError(error)) as never;
  }
}

// --- Thunks -----------------------------------------------------------------------------------
// Fetches skip themselves (`condition`) while the same request is already in flight.

export const fetchProjects = createAsyncThunk<Project[], void, ThunkConfig>(
  "projects/fetchAll",
  (_, { signal, rejectWithValue }) => call(() => projectsApi.list(signal), rejectWithValue),
  { condition: (_, { getState }) => getState().projects.list.status !== "loading" },
);

export const fetchProject = createAsyncThunk<Project, number, ThunkConfig>(
  "projects/fetchOne",
  (projectId, { signal, rejectWithValue }) => call(() => projectsApi.get(projectId, signal), rejectWithValue),
  { condition: (projectId, { getState }) => getState().projects.detail[projectId]?.status !== "loading" },
);

export const createProject = createAsyncThunk<Project, ProjectPayload, ThunkConfig>(
  "projects/create",
  (payload, { rejectWithValue }) => call(() => projectsApi.create(payload), rejectWithValue),
);

export const fetchProjectSummary = createAsyncThunk<ProjectSummary, number, ThunkConfig>(
  "projects/fetchSummary",
  (projectId, { signal, rejectWithValue }) => call(() => projectsApi.summary(projectId, signal), rejectWithValue),
);

export const fetchProjectMembers = createAsyncThunk<User[], number, ThunkConfig>(
  "projects/fetchMembers",
  (projectId, { signal, rejectWithValue }) => call(() => projectsApi.members(projectId, signal), rejectWithValue),
  { condition: (projectId, { getState }) => getState().projects.members[projectId]?.status !== "loading" },
);

type MemberChange = { projectId: number; userId: number };

/** Owner only. Resolves to the updated member list. */
export const addProjectMember = createAsyncThunk<User[], MemberChange, ThunkConfig>(
  "projects/addMember",
  ({ projectId, userId }, { rejectWithValue }) => call(() => projectsApi.addMember(projectId, userId), rejectWithValue),
);

/** Owner only. The server also unassigns the user from the project's tasks. */
export const removeProjectMember = createAsyncThunk<User[], MemberChange, ThunkConfig>(
  "projects/removeMember",
  ({ projectId, userId }, { rejectWithValue }) =>
    call(() => projectsApi.removeMember(projectId, userId), rejectWithValue),
);

// --- Slice ------------------------------------------------------------------------------------

export const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state, { meta }) => requestPending(state.list, meta.requestId))
      .addCase(fetchProjects.fulfilled, (state, { payload }) => {
        projectsAdapter.upsertMany(state.entities, payload);
        state.list = { status: "succeeded", ids: payload.map((p) => p.id) };
      })
      .addCase(fetchProjects.rejected, (state, action) =>
        requestFailed(state.list, action),
      )

      .addCase(fetchProject.pending, (state, { meta }) => {
        state.detail[meta.arg] = { status: "loading", requestId: meta.requestId };
      })
      .addCase(fetchProject.fulfilled, (state, { payload, meta }) => {
        projectsAdapter.upsertOne(state.entities, payload);
        state.detail[meta.arg] = { status: "succeeded" };
      })
      .addCase(fetchProject.rejected, (state, action) => {
        state.detail[action.meta.arg] ??= { status: "idle" };
        requestFailed(state.detail[action.meta.arg], action);
      })

      .addCase(createProject.fulfilled, (state, { payload }) => {
        projectsAdapter.upsertOne(state.entities, payload);
        state.list.ids.unshift(payload.id); // newest first, like the server
      })

      .addCase(fetchProjectSummary.pending, (state, { meta }) => {
        state.summaries[meta.arg] ??= { status: "idle" };
        requestPending(state.summaries[meta.arg], meta.requestId); // keeps the previous summary visible meanwhile
      })
      .addCase(fetchProjectSummary.fulfilled, (state, { payload, meta }) => {
        state.summaries[meta.arg] = { status: "succeeded", data: payload };
      })
      .addCase(fetchProjectSummary.rejected, (state, action) =>
        requestFailed(state.summaries[action.meta.arg], action),
      )

      .addCase(fetchProjectMembers.pending, (state, { meta }) => {
        state.members[meta.arg] ??= { status: "idle" };
        requestPending(state.members[meta.arg], meta.requestId);
      })
      .addCase(fetchProjectMembers.fulfilled, (state, { payload, meta }) => {
        state.members[meta.arg] = { status: "succeeded", data: payload };
      })
      .addCase(fetchProjectMembers.rejected, (state, action) =>
        requestFailed(state.members[action.meta.arg], action),
      )

      .addMatcher(
        (action) => addProjectMember.fulfilled.match(action) || removeProjectMember.fulfilled.match(action),
        (state, action: ReturnType<typeof addProjectMember.fulfilled>) => {
          state.members[action.meta.arg.projectId] = { status: "succeeded", data: action.payload };
        },
      );
  },
});

// --- Selectors --------------------------------------------------------------------------------

const IDLE_DATA: AsyncData<never> = IDLE;

/** Projects in server order (memoized: same array as long as the data doesn't change). */
export const selectProjectList = createSelector(
  [(state: State) => state.projects.list.ids, (state: State) => state.projects.entities.entities],
  (ids, entities) => ids.map((id) => entities[id]).filter((p): p is Project => p !== undefined),
);
export const selectProjectListState = (state: State): RequestState => state.projects.list;
// Selectors that need an id are curried: useAppSelector(selectProjectById(projectId)).
export const selectProjectById =
  (projectId: number) =>
  (state: State): Project | undefined =>
    state.projects.entities.entities[projectId];
export const selectProjectDetailState =
  (projectId: number) =>
  (state: State): RequestState =>
    state.projects.detail[projectId] ?? IDLE;
export const selectProjectSummary =
  (projectId: number) =>
  (state: State): AsyncData<ProjectSummary> =>
    state.projects.summaries[projectId] ?? IDLE_DATA;
export const selectProjectMembers =
  (projectId: number) =>
  (state: State): AsyncData<User[]> =>
    state.projects.members[projectId] ?? IDLE_DATA;
