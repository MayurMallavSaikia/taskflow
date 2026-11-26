import { useCallback, useEffect, useRef, useState } from "react";
import { toApiError, type ApiError } from "@/shared/api/errors";

export type AsyncResult<R> = { ok: true; value: R } | { ok: false; error: ApiError };

/**
 * Local loading/error state for a one-off action (save, delete, log in...). Global state is for
 * data that's shared; whether *this* form's submit is in flight only matters to this form.
 *
 * `run` never throws: it resolves to { ok, value } or { ok: false, error }.
 *
 *   const save = useAsyncAction((p: TaskPayload) => dispatch(createTask(p)).unwrap());
 *   const result = await save.run(payload);
 */
export function useAsyncAction<Args extends unknown[], R>(action: (...args: Args) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const mounted = useRef(true);
  const latestAction = useRef(action);
  latestAction.current = action;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args: Args): Promise<AsyncResult<R>> => {
    setIsPending(true);
    setError(undefined);
    try {
      const value = await latestAction.current(...args);
      if (mounted.current) setIsPending(false);
      return { ok: true, value };
    } catch (thrown) {
      const apiError = toApiError(thrown);
      if (mounted.current) {
        setIsPending(false);
        setError(apiError);
      }
      return { ok: false, error: apiError };
    }
  }, []);

  const reset = useCallback(() => setError(undefined), []);

  return { run, isPending, error, reset };
}
