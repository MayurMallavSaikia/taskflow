import type { ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { toApiError, type ApiError } from "@/shared/api/errors";

/**
 * Small Redux helpers shared by every slice. This layer can't import the store (app layer), so
 * the hooks aren't tied to RootState: selectors declare the part of the state they read, and
 * useAppSelector infers the state type from the selector.
 */

export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

/** Where a request is, plus its error when it failed. */
export interface RequestState {
  status: RequestStatus;
  error?: ApiError;
  /** Id of the latest request (thunk `meta.requestId`); results of older ones are ignored. */
  requestId?: string;
}

/** A request together with the data it loaded. `data` is kept while a refetch runs or fails. */
export type AsyncData<T> = RequestState & { data?: T };

/** Shared "never requested" value, so selectors return the same object every time. */
export const IDLE: RequestState = Object.freeze({ status: "idle" as const });

/** The parts of a rejected thunk action that requestFailed needs. */
interface RejectedAction {
  payload?: ApiError;
  meta: { requestId: string; aborted: boolean };
}

/** Marks a request as running. Keeps existing data so the UI doesn't flash empty. */
export function requestPending(request: RequestState | undefined, requestId: string): void {
  if (!request) return;
  request.status = "loading";
  request.error = undefined;
  request.requestId = requestId;
}

/**
 * Marks a request as failed. Ignored if a newer request has started since (e.g. React StrictMode
 * mounts twice: the first request is aborted and its rejection arrives after the second started).
 * A cancelled request (`aborted`, e.g. the page unmounted or a newer search replaced it) isn't an
 * error: it goes back to whatever it had before.
 */
export function requestFailed(request: RequestState | undefined, { payload: error, meta }: RejectedAction): void {
  if (!request) return;
  if (request.requestId !== meta.requestId) return;
  if (meta.aborted) {
    request.status = (request as AsyncData<unknown>).data !== undefined ? "succeeded" : "idle";
    request.error = undefined;
    return;
  }
  request.status = "failed";
  request.error = error ?? toApiError(undefined);
}

/**
 * Runs an API call inside a thunk and rejects with a serializable ApiError instead of throwing
 * the axios error (which can't be stored in Redux).
 *
 *   (id, { signal, rejectWithValue }) => callApi(() => api.get(id, signal), rejectWithValue)
 */
export async function callApi<T, R>(request: () => Promise<T>, rejectWithValue: (error: ApiError) => R): Promise<T | R> {
  try {
    return await request();
  } catch (error) {
    return rejectWithValue(toApiError(error));
  }
}

// `any` state: thunks declare the slices they read, which a dispatch typed with `unknown` state
// would reject. Results of dispatch(thunk) (incl. .unwrap()) are still fully typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppThunkDispatch = ThunkDispatch<any, unknown, UnknownAction>;

export const useAppDispatch = useDispatch.withTypes<AppThunkDispatch>();
export const useAppSelector = useSelector;

