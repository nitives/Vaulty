"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  getBillingEntitlements,
  hasBillingSyncAccess,
  VAULTY_BILLING_CHANGED_EVENT,
} from "@/lib/billing";
import {
  initializeLiveVaultSync,
  pullRemoteVaultNow,
  syncVaultNow,
} from "@/lib/storage";
import { supabaseConfig } from "@/lib/supabase";
import { subscribeToVaultRecordChanges } from "@/lib/sync";
import {
  isSyncAccountCompatible,
  VAULTY_SYNC_ACCOUNT_CHANGED_EVENT,
} from "@/lib/syncAccount";

const LIVE_SYNC_DEBOUNCE_MS = 350;
const FULL_RECONCILE_INTERVAL_MS = 5 * 60 * 1000;

export function LiveSyncProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const [accountRevision, setAccountRevision] = useState(0);
  const [billingRevision, setBillingRevision] = useState(0);

  useEffect(() => {
    const handleAccountChange = () => {
      setAccountRevision((current) => current + 1);
    };
    window.addEventListener(
      VAULTY_SYNC_ACCOUNT_CHANGED_EVENT,
      handleAccountChange,
    );
    return () => {
      window.removeEventListener(
        VAULTY_SYNC_ACCOUNT_CHANGED_EVENT,
        handleAccountChange,
      );
    };
  }, []);

  useEffect(() => {
    const handleBillingChange = () => {
      setBillingRevision((current) => current + 1);
    };
    window.addEventListener(
      VAULTY_BILLING_CHANGED_EVENT,
      handleBillingChange,
    );
    return () => {
      window.removeEventListener(
        VAULTY_BILLING_CHANGED_EVENT,
        handleBillingChange,
      );
    };
  }, []);

  useEffect(() => {
    if (
      !session ||
      !supabaseConfig.isConfigured ||
      !isSyncAccountCompatible(session.user.id)
    ) {
      return;
    }

    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let reconcileInterval: number | undefined;

    const runSync = async (mode: "pull" | "full" | "initialize") => {
      if (disposed) return;

      if (syncingRef.current) {
        pendingRef.current = true;
        return;
      }

      syncingRef.current = true;
      try {
        const result =
          mode === "pull"
            ? await pullRemoteVaultNow()
            : mode === "initialize"
              ? await initializeLiveVaultSync()
              : await syncVaultNow();
        if (!result.success) {
          throw new Error(result.error ?? "Vaulty sync failed.");
        }
      } catch (err) {
        console.error("Vaulty live sync failed:", err);
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
        () => {
          void runSync("pull");
        },
        LIVE_SYNC_DEBOUNCE_MS,
      );
    };

    const startLiveSync = async () => {
      try {
        const entitlements = await getBillingEntitlements();
        if (disposed || !hasBillingSyncAccess(entitlements)) {
          return;
        }

        try {
          unsubscribe = await subscribeToVaultRecordChanges(schedulePull);
        } catch (err) {
          console.error(
            "Vaulty realtime is unavailable; periodic sync will continue:",
            err,
          );
        }

        if (disposed) {
          unsubscribe?.();
          return;
        }

        await runSync("initialize");
        reconcileInterval = window.setInterval(() => {
          void runSync("full");
        }, FULL_RECONCILE_INTERVAL_MS);
      } catch (err) {
        console.error("Vaulty live sync failed:", err);
      }
    };

    const handleOnline = () => {
      void runSync("full");
    };
    window.addEventListener("online", handleOnline);
    void startLiveSync();

    return () => {
      disposed = true;
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (reconcileInterval) {
        window.clearInterval(reconcileInterval);
      }
      window.removeEventListener("online", handleOnline);
      unsubscribe?.();
    };
  }, [accountRevision, billingRevision, session]);

  return <>{children}</>;
}
