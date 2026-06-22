"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getInitialMediaUrl, resolveMediaUrl } from "@/lib/media";

export function useResolvedMediaUrl(
  mediaPath: string | null | undefined,
): string {
  const { session } = useAuth();
  const authKey = session?.accessToken ?? "";
  const initialUrl = useMemo(() => getInitialMediaUrl(mediaPath), [mediaPath]);
  const requestKey = `${authKey}:${mediaPath ?? ""}`;
  const [resolved, setResolved] = useState({ key: requestKey, url: initialUrl });

  useEffect(() => {
    let cancelled = false;

    if (!mediaPath) {
      return () => {
        cancelled = true;
      };
    }

    void resolveMediaUrl(mediaPath)
      .then((url) => {
        if (!cancelled) {
          setResolved({ key: requestKey, url });
        }
      })
      .catch((err) => {
        console.error("Failed to resolve Vaulty media URL:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaPath, requestKey]);

  return resolved.key === requestKey ? resolved.url : initialUrl;
}
