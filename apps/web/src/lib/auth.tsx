"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getSupabaseHeaders,
  readSupabaseError,
  supabaseConfig,
} from "@/lib/supabase";

const SESSION_STORAGE_KEY = "vaulty-supabase-session";
const REFRESH_LEEWAY_SECONDS = 90;
const SESSION_CHANGED_EVENT = "vaulty:auth-session-changed";
let refreshPromise: Promise<AuthSession | null> | null = null;

export interface SupabaseUser {
  id: string;
  email?: string | null;
}

interface SupabaseAuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: SupabaseUser | null;
  session?: SupabaseAuthResponse | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: SupabaseUser;
}

interface AuthContextValue {
  session: AuthSession | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<AuthSession>;
  signUp: (email: string, password: string) => Promise<AuthSession | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as AuthSession;
    if (
      !session.accessToken ||
      !session.refreshToken ||
      !Number.isFinite(session.expiresAt) ||
      !session.user?.id
    ) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

function normalizeSession(
  response: SupabaseAuthResponse,
  previousSession?: AuthSession,
): AuthSession | null {
  const source = response.session ?? response;
  if (
    !source?.access_token ||
    !(source.refresh_token || previousSession?.refreshToken) ||
    !source.user?.id
  ) {
    return null;
  }

  const expiresAt =
    source.expires_at ??
    Math.floor(Date.now() / 1000) + (source.expires_in ?? 3600);

  return {
    accessToken: source.access_token,
    refreshToken: source.refresh_token ?? previousSession?.refreshToken ?? "",
    expiresAt,
    user: source.user,
  };
}

class AuthRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthRequestError";
  }
}

async function authRequest(
  path: string,
  init: RequestInit,
  accessToken?: string,
): Promise<SupabaseAuthResponse> {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${supabaseConfig.url}/auth/v1/${path}`, {
    ...init,
    headers: {
      ...getSupabaseHeaders(accessToken),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new AuthRequestError(await readSupabaseError(response), response.status);
  }

  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  return JSON.parse(text) as SupabaseAuthResponse;
}

async function refreshStoredSession(
  session: AuthSession,
): Promise<AuthSession | null> {
  try {
    const response = await authRequest("token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    const refreshed = normalizeSession(response, session);
    if (!refreshed) {
      throw new Error("Supabase did not return a refreshed session.");
    }

    const current = getStoredSession();
    if (current?.refreshToken !== session.refreshToken) {
      return current;
    }

    storeSession(refreshed);
    return refreshed;
  } catch (err) {
    if (
      err instanceof AuthRequestError &&
      (err.status === 400 || err.status === 401)
    ) {
      const current = getStoredSession();
      if (current?.refreshToken === session.refreshToken) {
        storeSession(null);
      }
      return null;
    }

    throw err;
  }
}

export async function getActiveSession(): Promise<AuthSession | null> {
  const session = getStoredSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt - now > REFRESH_LEEWAY_SECONDS) {
    return session;
  }

  if (!refreshPromise) {
    refreshPromise = refreshStoredSession(session).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getStoredSession(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const activeSession = await getActiveSession();
      setSession(activeSession);
      return activeSession;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not refresh your session: ${message}`);
      const storedSession = getStoredSession();
      setSession((current) => {
        if (
          current?.accessToken === storedSession?.accessToken &&
          current?.refreshToken === storedSession?.refreshToken &&
          current?.expiresAt === storedSession?.expiresAt
        ) {
          return current;
        }
        return storedSession;
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [refresh]);

  useEffect(() => {
    const handleSessionChanged = () => {
      setSession(getStoredSession());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SESSION_STORAGE_KEY) {
        handleSessionChanged();
      }
    };

    window.addEventListener(SESSION_CHANGED_EVENT, handleSessionChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, handleSessionChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    const refreshSafely = () => {
      void refresh().catch(() => {});
    };
    const now = Math.floor(Date.now() / 1000);
    const refreshInMs = Math.max(
      0,
      (session.expiresAt - now - REFRESH_LEEWAY_SECONDS) * 1000,
    );
    const timer = window.setTimeout(
      refreshSafely,
      Math.min(refreshInMs, 2_147_000_000),
    );
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSafely();
      }
    };

    window.addEventListener("online", refreshSafely);
    window.addEventListener("focus", refreshSafely);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", refreshSafely);
      window.removeEventListener("focus", refreshSafely);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh, session]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const response = await authRequest("token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const nextSession = normalizeSession(response);

      if (!nextSession) {
        throw new Error("Supabase did not return an active session.");
      }

      storeSession(nextSession);
      setSession(nextSession);
      return nextSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const response = await authRequest("signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const nextSession = normalizeSession(response);

      if (nextSession) {
        storeSession(nextSession);
        setSession(nextSession);
      }

      return nextSession;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    const storedSession = getStoredSession();
    storeSession(null);
    setSession(null);
    setError(null);

    try {
      if (storedSession) {
        await authRequest(
          "logout?scope=local",
          { method: "POST" },
          storedSession.accessToken,
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Signed out on this device. Session revocation failed: ${message}`);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isConfigured: supabaseConfig.isConfigured,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [error, isLoading, refresh, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
