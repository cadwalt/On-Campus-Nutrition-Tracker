import { useEffect, useState } from "react";
import type { WeightEntry } from "../types/weight";
import * as weightService from "../services/weightService";

export function useWeightEntries() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        // Start by subscribing to real-time updates
        unsub = await weightService.subscribeToWeightEntries((items) => {
          if (!mounted) return;
          setEntries(items);
          setLoading(false);
        });
      } catch (err) {
        console.error("useWeightEntries: failed to subscribe", err);
        // fallback to one-time load
        try {
          const items = await weightService.getWeightEntries();
          if (mounted) setEntries(items);
        } catch (err2) {
          console.error("useWeightEntries: failed to load fallback", err2);
        } finally {
          if (mounted) setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  const add = async (entry: Omit<WeightEntry, "id">) => {
    const e = await weightService.addWeightEntry(entry);
    setEntries((s) => [...s, e].sort((a, b) => (a.date < b.date ? -1 : 1)));
    return e;
  };

  const update = async (id: string, patch: Partial<WeightEntry>) => {
    const updated = await weightService.updateWeightEntry(id, patch);
    if (updated) setEntries((s) => s.map((x) => (x.id === id ? updated : x)));
    return updated;
  };

  const remove = async (id: string) => {
    const ok = await weightService.deleteWeightEntry(id);
    if (ok) setEntries((s) => s.filter((x) => x.id !== id));
    return ok;
  };

  const refresh = async () => {
    const items = await weightService.getWeightEntries();
    setEntries(items);
  };

  return { entries, loading, add, update, remove, refresh };
}
