function readKeyDictionary(envName: string): string | null {
  const rawValue = Deno.env.get(envName);
  if (!rawValue) return null;

  try {
    const keys = JSON.parse(rawValue) as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? null;
  } catch {
    return null;
  }
}

export function getSupabasePublishableKey(): string | null {
  return (
    Deno.env.get("SUPABASE_ANON_KEY") ??
    readKeyDictionary("SUPABASE_PUBLISHABLE_KEYS")
  );
}

export function getSupabaseSecretKey(): string | null {
  return (
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    readKeyDictionary("SUPABASE_SECRET_KEYS")
  );
}
