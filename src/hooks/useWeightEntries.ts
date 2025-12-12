import { useEffect, useState } from "react";
import type { WeightEntry } from "../types/weight";
import * as weightService from "../services/weightService";
import { resolveFirebase } from "../lib/resolveFirebase";

/**
 * Custom hook for managing weight entries
 * Separates data fetching from UI rendering
 * Single responsibility: CRUD operations and subscriptions
 */
export function useWeightEntries() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Setup subscription on mount
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    /**
     * Initialize subscription and data
     * Does one thing: setup listeners
     */
    const initializeSubscription = async () => {
      try {
        // Get current user UID for data scoping (CWE-862)
        const { auth } = await resolveFirebase();
        const uid = auth?.currentUser?.uid;

        // Initial data load (one-time fetch)
        try {
          const items = await weightService.getWeightEntries(uid);
          if (mounted) {
            setEntries(items);
          }
        } catch (err) {
          console.error('useWeightEntries: initial load failed', err);
        }

        // Real-time subscription
        unsubscribe = await weightService.subscribeToWeightEntries(
          (items) => {
            if (mounted) {
              setEntries(items);
            }
          },
          uid
        );
      } catch (err) {
        console.error("useWeightEntries: failed to initialize", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeSubscription();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /**
   * Add new entry
   * Single responsibility: Create
   */
  const add = async (entry: Omit<WeightEntry, "id">) => {
    return await weightService.addWeightEntry(entry);
  };

  /**
   * Update entry
   * Single responsibility: Update
   */
  const update = async (id: string, patch: Partial<WeightEntry>) => {
    const updated = await weightService.updateWeightEntry(id, patch);
    if (updated) {
      setEntries((prev) =>
        prev.map((entry) => (entry.id === id ? updated : entry))
      );
    }
    return updated;
  };

  /**
   * Delete entry
   * Single responsibility: Delete
   */
  const remove = async (id: string) => {
    const ok = await weightService.deleteWeightEntry(id);
    if (ok) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    }
    return ok;
  };

  /**
   * Refresh entries (manual sync)
   * Single responsibility: Refresh data
   */
  const refresh = async () => {
    const items = await weightService.getWeightEntries();
    setEntries(items);
  };

  return { entries, loading, add, update, remove, refresh };
}
