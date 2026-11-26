import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/shared/lib/redux";
import { expireSession, selectSession } from "../model/authSlice";

/** Logs out at the moment the token expires, instead of waiting for the next request to fail. Renders nothing. */
export const SessionWatcher: React.FC = () => {
  const dispatch = useAppDispatch();
  const expiresAt = useAppSelector(selectSession)?.expiresAt;

  useEffect(() => {
    if (!expiresAt) return;
    const msUntilExpiry = new Date(expiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => dispatch(expireSession()), Math.max(msUntilExpiry, 0));
    return () => window.clearTimeout(timer);
  }, [dispatch, expiresAt]);

  return null;
};

