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

export interface SupabaseUser {
  id: string;
  email?: string;
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
      !session.expiresAt ||
      !session.user?.id
    ) {
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
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function normalizeSession(response: SupabaseAuthResponse): AuthSession | null {
  const source = response.session ?? response;
  if (
    !source?.access_token ||
    !source.refresh_token ||
    !source.user?.id
  ) {
    return null;
  }

  const expiresAt =
    source.expires_at ??
    Math.floor(Date.now() / 1000) + (source.expires_in ?? 3600);

  return {
    accessToken: source.access_token,
    refreshToken: source.refresh_token,
    expiresAt,
    user: source.user,
  };
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
    throw new Error(await readSupabaseError(response));
  }

  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  return JSON.parse(text) as SupabaseAuthResponse;
}

export async function getActiveSession(): Promise<AuthSession | null> {
  const session = getStoredSession();
  if (!session) return null;

  const now = Math.floor(Date.now() / 1000);
  if (session.expiresAt - now > REFRESH_LEEWAY_SECONDS) {
    return session;
  }

  try {
    const response = await authRequest("token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    const refreshed = normalizeSession(response);
    storeSession(refreshed);
    return refreshed;
  } catch {
    storeSession(null);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const activeSession = await getActiveSession();
    setSession(activeSession);
    return activeSession;
  }, []);

  useEffect(() => {
    refresh()
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
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
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
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
  }, []);

  const signOut = useCallback(async () => {
    const activeSession = await getActiveSession();

    try {
      if (activeSession) {
        await authRequest("logout", { method: "POST" }, activeSession.accessToken);
      }
    } finally {
      storeSession(null);
      setSession(null);
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
