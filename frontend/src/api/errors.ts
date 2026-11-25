import axios from "axios";
import type { ApiErrorBody } from "./types";

function getBody(error: unknown): ApiErrorBody | undefined {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data;
  }
  return undefined;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error) && !error.response) {
    return "Can't reach the server. Check your connection and try again.";
  }
  return getBody(error)?.message ?? fallback;
}

/** Field-level validation errors from the API, keyed by field name. */
export function getFieldErrors(error: unknown): Record<string, string> {
  const fieldErrors = getBody(error)?.fieldErrors ?? [];
  return Object.fromEntries(fieldErrors.map((e) => [e.field, e.message]));
}
