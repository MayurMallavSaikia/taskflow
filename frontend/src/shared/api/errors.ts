import axios from "axios";
import type { ApiErrorBody } from "./types";

/**
 * A request failure in a plain, serializable shape, so it can live in the Redux store
 * (thunks reject with it) and be rendered without knowing about axios.
 */
export interface ApiError {
  /** HTTP status; undefined when the server couldn't be reached or the request was cancelled. */
  status?: number;
  message: string;
  /** Field-level validation errors keyed by field name. */
  fieldErrors: Record<string, string>;
  /** True when the request was cancelled on purpose (e.g. superseded by a newer search). */
  aborted?: boolean;
}

export const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your connection and try again.";
export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ApiError).message === "string" &&
    typeof (value as ApiError).fieldErrors === "object" &&
    !axios.isAxiosError(value)
  );
}

/** Normalizes anything thrown by an API call (axios error, ApiError, unknown) into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (axios.isCancel(error)) return { message: "Request cancelled", fieldErrors: {}, aborted: true };
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) return { message: NETWORK_ERROR_MESSAGE, fieldErrors: {} };
    const body = error.response.data;
    return {
      status: error.response.status,
      message: body?.message ?? GENERIC_ERROR_MESSAGE,
      fieldErrors: Object.fromEntries((body?.fieldErrors ?? []).map((e) => [e.field, e.message])),
    };
  }
  return { message: GENERIC_ERROR_MESSAGE, fieldErrors: {} };
}

export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}

/** Field-level validation errors from the API, keyed by field name. */
export function getFieldErrors(error: unknown): Record<string, string> {
  return error ? toApiError(error).fieldErrors : {};
}

