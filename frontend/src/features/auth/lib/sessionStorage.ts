import type { User } from "@/entities/user";

const STORAGE_KEY = "taskflow.session";

export interface StoredSession {
  token: string;
  expiresAt: string;
  user: User;
}

/** Persists the session in localStorage so a reload keeps you logged in. Expired sessions are dropped. */
export const sessionStorage = {
  load(): StoredSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as StoredSession;
      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  save(session: StoredSession) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};

