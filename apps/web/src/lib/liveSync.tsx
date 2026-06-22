"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { getBillingEntitlements, hasBillingSyncAccess } from "@/lib/billing";
import { initializeLiveVaultSync, pullRemoteVaultNow } from "@/lib/storage";
import { supabaseConfig } from "@/lib/supabase";
import { subscribeToVaultRecordChanges } from "@/lib/sync";

const LIVE_SYNC_DEBOUNCE_MS = 350;

export function LiveSyncProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!session || !supabaseConfig.isConfigured) return;

    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    const pullRemoteChanges = async () => {
      if (disposed) return;

      if (syncingRef.current) {
        pendingRef.current = true;
        return;
      }

      syncingRef.current = true;
      try {
        await pullRemoteVaultNow();
      } catch (err) {
        console.error("Vaulty realtime pull failed:", err);
      } finally {
        syncingRef.current = false;
        if (pendingRef.current && !disposed) {
          pendingRef.current = false;
          schedulePull();
        }
      }
    };

    const schedulePull = () => {
      if (disposed) return;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(
        pullRemoteChanges,
        LIVE_SYNC_DEBOUNCE_MS,
      );
    };

    const startLiveSync = async () => {
      try {
        const entitlements = await getBillingEntitlements();
        if (disposed || !hasBillingSyncAccess(entitlements)) {
          return;
        }

        unsubscribe = await subscribeToVaultRecordChanges(schedulePull);
        if (disposed) return;

        await initializeLiveVaultSync();
      } catch (err) {
        console.error("Vaulty live sync failed:", err);
      }
    };

    void startLiveSync();

    return () => {
      disposed = true;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      unsubscribe?.();
    };
  }, [session]);

  return <>{children}</>;
}
