import { useEffect, useState } from "react";
import type { WeightEntry } from "../types/weight";
import * as weightService from "../services/weightService";
import { resolveFirebase } from "../lib/resolveFirebase";

export function useWeightEntries() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        // Resolve the Firebase auth client (used elsewhere in the app) and get the current user uid
        const { auth } = await resolveFirebase();
        const uid = auth?.currentUser?.uid;

        // First, do an immediate one-time load so the UI has data right away (use uid when available)
        try {
          const items = await weightService.getWeightEntries(uid);
          if (mounted) setEntries(items);
        } catch (errLoad) {
          console.error('useWeightEntries: initial load failed', errLoad);
        }

        // Then subscribe to real-time updates to keep data fresh (pass uid)
        unsub = await weightService.subscribeToWeightEntries((items) => {
          if (!mounted) return;
          setEntries(items);
        }, uid);
      } catch (err) {
        console.error("useWeightEntries: failed to subscribe", err);
      } finally {
        if (mounted) setLoading(false);
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
