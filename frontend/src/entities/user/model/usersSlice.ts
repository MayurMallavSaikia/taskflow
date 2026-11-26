import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { toApiError, type ApiError } from "@/shared/api/errors";
import { requestFailed, requestPending, type AsyncData } from "@/shared/lib/redux";
import { usersApi } from "../api/usersApi";
import type { User } from "./types";

/** Users rarely change while the app is open, so a fetched list is reused for a while. */
export const USERS_STALE_MS = 5 * 60 * 1000;

export interface UsersState {
  all: AsyncData<User[]> & { fetchedAt?: number };
}

type State = { users: UsersState };

const initialState: UsersState = { all: { status: "idle" } };

export const fetchUsers = createAsyncThunk<User[], void, { state: State; rejectValue: ApiError }>(
  "users/fetchAll",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await usersApi.list(signal);
    } catch (error) {
      return rejectWithValue(toApiError(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { status, fetchedAt } = getState().users.all;
      if (status === "loading") return false;
      return !(status === "succeeded" && fetchedAt && Date.now() - fetchedAt < USERS_STALE_MS);
    },
  },
);

export const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state, { meta }) => requestPending(state.all, meta.requestId))
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.all = { status: "succeeded", data: action.payload, fetchedAt: Date.now() };
      })
      .addCase(fetchUsers.rejected, (state, action) =>
        requestFailed(state.all, action),
      );
  },
});

export const selectAllUsers = (state: State) => state.users.all;
