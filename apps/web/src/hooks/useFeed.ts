import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pulse,
  PulseItem,
  loadPulses,
  loadPulseItems,
  markPulseItemSeen,
  onNewPulseItem,
} from "@/lib/storage";

export interface FeedItem extends PulseItem {
  pulseName: string;
}

function isExpired(item: PulseItem): boolean {
  if (!item.expiresAt) {
    return false;
  }
  return item.expiresAt.getTime() <= Date.now();
}

export function useFeed() {
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [pulseItems, setPulseItems] = useState<PulseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFeedData() {
      try {
        const [storedPulses, storedItems] = await Promise.all([
          loadPulses(),
          loadPulseItems(),
        ]);

        if (!isMounted) return;

        setPulses(storedPulses);
        setPulseItems(storedItems);
      } catch (error) {
        console.error("Failed to load feed data:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFeedData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return onNewPulseItem((newItem) => {
      if (isExpired(newItem)) {
        return;
      }

      setPulseItems((current) => {
        const duplicate = current.some((item) => item.id === newItem.id);
        if (duplicate) {
          return current;
        }

        return [newItem, ...current];
      });
    });
  }, []);

  const pulseNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pulse of pulses) {
      map.set(pulse.id, pulse.name);
    }
    return map;
  }, [pulses]);

  const feedItems = useMemo(() => {
    return pulseItems
      .filter((item) => !item.isSeen)
      .filter((item) => !isExpired(item))
      .map((item) => ({
        ...item,
        pulseName: pulseNameById.get(item.pulseId) ?? item.pulseId,
      }));
  }, [pulseItems, pulseNameById]);

  const unseenCount = feedItems.length;

  const handleSeen = useCallback(async (id: string) => {
    setPulseItems((items) =>
      items.map((item) => (item.id === id ? { ...item, isSeen: true } : item)),
    );
    await markPulseItemSeen(id);
  }, []);

  return {
    pulses,
    feedItems,
    unseenCount,
    isLoading,
    markSeen: handleSeen,
  };
}
