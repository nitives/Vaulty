"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { syncVaultNow } from "@/lib/storage";
import { createSupabaseBrowserClient, supabaseConfig } from "@/lib/supabase";

const LIVE_SYNC_DEBOUNCE_MS = 900;

export function LiveSyncProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!session || !supabaseConfig.isConfigured) return;

    const client = createSupabaseBrowserClient();
    client.realtime.setAuth(session.accessToken);

    const runSync = async () => {
      if (syncingRef.current) {
        pendingRef.current = true;
        return;
      }

      syncingRef.current = true;
      try {
        await syncVaultNow();
      } catch (err) {
        console.error("Vaulty live sync failed:", err);
      } finally {
        syncingRef.current = false;
        if (pendingRef.current) {
          pendingRef.current = false;
          syncTimerRef.current = setTimeout(runSync, LIVE_SYNC_DEBOUNCE_MS);
        }
      }
    };

    const scheduleSync = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(runSync, LIVE_SYNC_DEBOUNCE_MS);
    };

    const channel = client
      .channel(`vaulty-live-sync-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vault_records",
          filter: `user_id=eq.${session.user.id}`,
        },
        scheduleSync,
      )
      .subscribe();

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      void client.removeChannel(channel);
    };
  }, [session]);

  return <>{children}</>;
}
