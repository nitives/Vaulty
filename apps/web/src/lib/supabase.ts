import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthSession } from "@/lib/auth";

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
  isConfigured: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export const supabaseConfig: SupabaseConfig = {
  url: supabaseUrl.replace(/\/+$/, ""),
  publishableKey: supabasePublishableKey,
  isConfigured: Boolean(supabaseUrl && supabasePublishableKey),
};

export const VAULT_ASSETS_BUCKET = "vault-assets";

export function createSupabaseBrowserClient(): SupabaseClient {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }

  return createClient(supabaseConfig.url, supabaseConfig.publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function createAuthedSupabaseBrowserClient(
  session: Pick<AuthSession, "accessToken" | "refreshToken">,
): Promise<SupabaseClient> {
  const client = createSupabaseBrowserClient();
  const { error } = await client.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  return client;
}

export function getSupabaseHeaders(accessToken?: string): HeadersInit {
  const headers: HeadersInit = {
    apikey: supabaseConfig.publishableKey,
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function readSupabaseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      msg?: string;
      message?: string;
      error?: string;
      error_description?: string;
      hint?: string;
    };

    return (
      body.error_description ||
      body.message ||
      body.msg ||
      body.error ||
      body.hint ||
      `${response.status} ${response.statusText}`
    );
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}
