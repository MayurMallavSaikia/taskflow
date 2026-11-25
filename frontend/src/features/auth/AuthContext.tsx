import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler } from "../../api/client";
import type { AuthResponse, User } from "../../api/types";
import { tokenStorage, type StoredSession } from "../../utils/tokenStorage";

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  sessionExpired: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<StoredSession | null>(() => tokenStorage.load());
  const [sessionExpired, setSessionExpired] = useState(false);

  const endSession = useCallback(
    (expired: boolean) => {
      tokenStorage.clear();
      queryClient.clear();
      setSession(null);
      setSessionExpired(expired);
    },
    [queryClient],
  );

  const login = useCallback((response: AuthResponse) => {
    const next = { token: response.token, expiresAt: response.expiresAt, user: response.user };
    tokenStorage.save(next);
    setSession(next);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => endSession(false), [endSession]);

  // Any 401 from the API means the token is no longer valid.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession(true));
    return () => setUnauthorizedHandler(null);
  }, [endSession]);

  // Log out at the moment the token expires, instead of waiting for the next failed request.
  useEffect(() => {
    if (!session) return;
    const msUntilExpiry = new Date(session.expiresAt).getTime() - Date.now();
    const timer = window.setTimeout(() => endSession(true), Math.max(msUntilExpiry, 0));
    return () => window.clearTimeout(timer);
  }, [session, endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, isAuthenticated: session !== null, sessionExpired, login, logout }),
    [session, sessionExpired, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
