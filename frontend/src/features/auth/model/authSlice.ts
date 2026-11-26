import { createAsyncThunk, createSlice, isAnyOf, type Dispatch, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiError } from "@/shared/api/errors";
import { callApi } from "@/shared/lib/redux";
import { authApi, type AuthResponse, type LoginPayload, type RegisterPayload } from "../api/authApi";
import { sessionStorage, type StoredSession } from "../lib/sessionStorage";

export interface AuthState {
  session: StoredSession | null;
  /** True after the session ended on its own (token expired / 401), to explain why you're on the login page. */
  sessionExpired: boolean;
}

type State = { auth: AuthState };
type ThunkConfig = { state: State; rejectValue: ApiError };

// --- Thunks (side effects: the API and localStorage) ------------------------------------------

/** Saves the session so a reload keeps you logged in. */
function startSession(response: AuthResponse): StoredSession {
  const session = { token: response.token, expiresAt: response.expiresAt, user: response.user };
  sessionStorage.save(session);
  return session;
}

export const logIn = createAsyncThunk<StoredSession, LoginPayload, ThunkConfig>("auth/logIn", (payload, { rejectWithValue }) =>
  callApi(async () => startSession(await authApi.login(payload)), rejectWithValue),
);

export const register = createAsyncThunk<StoredSession, RegisterPayload, ThunkConfig>(
  "auth/register",
  (payload, { rejectWithValue }) => callApi(async () => startSession(await authApi.register(payload)), rejectWithValue),
);

/** One-click login as the shared demo account. */
export const logInAsGuest = createAsyncThunk<StoredSession, void, ThunkConfig>(
  "auth/logInAsGuest",
  (_, { rejectWithValue }) => callApi(async () => startSession(await authApi.guest()), rejectWithValue),
);

// --- Slice ------------------------------------------------------------------------------------

export const authSlice = createSlice({
  name: "auth",
  // Lazy, so every new store (a reload, each test) picks up whatever session is saved.
  initialState: (): AuthState => ({ session: sessionStorage.load(), sessionExpired: false }),
  reducers: {
    /**
     * The session is over. The root reducer (app/store.ts) also clears every cached project
     * and task when it sees this, so the next user starts from a clean store.
     */
    sessionEnded(state, action: PayloadAction<{ expired: boolean }>) {
      state.session = null;
      state.sessionExpired = action.payload.expired;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(isAnyOf(logIn.fulfilled, register.fulfilled, logInAsGuest.fulfilled), (state, action) => {
      state.session = action.payload;
      state.sessionExpired = false;
    });
  },
});

export const { sessionEnded } = authSlice.actions;

/** The user clicked "Log out". */
export const logOut = () => (dispatch: Dispatch) => {
  sessionStorage.clear();
  dispatch(sessionEnded({ expired: false }));
};

/** The token expired or the API answered 401. */
export const expireSession = () => (dispatch: Dispatch) => {
  sessionStorage.clear();
  dispatch(sessionEnded({ expired: true }));
};

// --- Selectors --------------------------------------------------------------------------------

export const selectSession = (state: State) => state.auth.session;
export const selectCurrentUser = (state: State) => state.auth.session?.user ?? null;
export const selectIsAuthenticated = (state: State) => state.auth.session !== null;
export const selectSessionExpired = (state: State) => state.auth.sessionExpired;
export const selectToken = (state: State) => state.auth.session?.token ?? null;

