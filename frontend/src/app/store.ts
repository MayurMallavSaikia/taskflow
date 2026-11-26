import { combineSlices, configureStore, type Reducer, type UnknownAction } from "@reduxjs/toolkit";
import { setAuthTokenProvider, setUnauthorizedHandler } from "@/shared/api/client";
import { projectsSlice } from "@/entities/project";
import { tasksSlice } from "@/entities/task";
import { usersSlice } from "@/entities/user";
import { authSlice, expireSession, selectToken, sessionEnded } from "@/features/auth";
import { boardSlice } from "@/features/board";

/**
 * State shape (each key is owned by one slice):
 *   auth      features/auth      the session (token + user)
 *   users     entities/user      all users, for picking project members
 *   projects  entities/project   projects by id, list order, summaries, member lists
 *   tasks     entities/task      tasks by id, single-task/activity requests, change revisions
 *   board     features/board     which tasks are in which board column for the open project
 * Board filters are not here: they live in the URL so boards and task links can be shared.
 */
const appReducer = combineSlices(authSlice, usersSlice, projectsSlice, tasksSlice, boardSlice);

export type RootState = ReturnType<typeof appReducer>;

/** On logout or expiry everything is reset, so the next user never sees the previous user's data. */
const rootReducer: Reducer<RootState, UnknownAction, Partial<RootState>> = (state, action) =>
  appReducer(sessionEnded.match(action) ? undefined : state, action);

export function setupStore(preloadedState?: Partial<RootState>) {
  const store = configureStore({ reducer: rootReducer, preloadedState });

  // The HTTP client (shared layer) can't import the store, so the app tells it where the token
  // comes from and what a 401 means.
  setAuthTokenProvider(() => selectToken(store.getState()));
  setUnauthorizedHandler(() => store.dispatch(expireSession()));

  return store;
}

export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore["dispatch"];

