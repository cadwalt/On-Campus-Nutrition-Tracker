import type { WeightEntry } from "../types/weight";
import { getFirestoreClient, getAuthClient } from "../firebase";

// Constants - avoid magic numbers
const COLLECTION = "weight";
const KG_TO_LB = 2.20462;
const AUTH_TIMEOUT_MS = 5000;
const FALLBACK_OWNER = "local";

/**
 * Single responsibility: Normalize legacy weight data format
 * Converts weightKg to weightLb for backward compatibility
 */
function normalizeWeightToLb(data: Record<string, unknown>): Record<string, unknown> {
  if (data.weightKg !== undefined && data.weightLb === undefined) {
    const weightKg = Number(data.weightKg);
    if (!Number.isNaN(weightKg)) {
      data.weightLb = Math.round((weightKg * KG_TO_LB) * 10) / 10;
    }
    delete data.weightKg;
  }
  return data;
}

/**
 * Gets the current user's UID
 * Falls back to 'local' if auth is not available
 * Pure function with single responsibility: Get UID or fallback
 */
function getCurrentUserUidSync(): string | null {
  try {
    // Synchronous check first
    const auth = getAuthClient();
    if (auth && 'currentUser' in auth) {
      const auth_sync = auth as any;
      return auth_sync.currentUser?.uid ?? null;
    }
  } catch (e) {
    // Auth not available yet
  }
  return null;
}

/**
 * Waits for auth state to initialize
 * Single responsibility: Wait for auth initialization
 */
async function waitForAuthStateInitialization(): Promise<string> {
  try {
    const auth = await getAuthClient();
    const firebaseAuth = await import('firebase/auth');
    const { onAuthStateChanged } = firebaseAuth as any;

    return await new Promise<string>((resolve) => {
      let resolved = false;

      // Safety timeout
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.debug('Auth state wait timed out, falling back to local');
          resolve(FALLBACK_OWNER);
        }
      }, AUTH_TIMEOUT_MS);

      const unsub = onAuthStateChanged(auth, (user: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          unsub?.();
        } catch (e) {
          // Unsubscribe error, safe to ignore
        }
        resolve(user?.uid ?? FALLBACK_OWNER);
      });
    });
  } catch (e) {
    return FALLBACK_OWNER;
  }
}

/**
 * Gets the owner UID for data access
 * Tries sync first, then async if needed
 */
async function getOwnerUid(): Promise<string> {
  const syncUid = getCurrentUserUidSync();
  if (syncUid) {
    return syncUid;
  }
  return await waitForAuthStateInitialization();
}

/**
 * Merges results from multiple queries
 * Single responsibility: Merge and deduplicate entries
 */
function mergeEntries(doc1: any, doc2: any): WeightEntry[] {
  const map = new Map<string, any>();

  const addDocs = (docs: any[]) => {
    docs.forEach((d) => {
      const data = normalizeWeightToLb(d.data());
      if (!map.has(d.id)) {
        map.set(d.id, { id: d.id, ...data });
      }
    });
  };

  addDocs(doc1);
  addDocs(doc2);

  const entries: WeightEntry[] = Array.from(map.values());
  entries.sort((a, b) => a.date.localeCompare(b.date));

  return entries;
}

/**
 * Fetches weight entries for a user
 * Single responsibility: Query and return entries
 */
export async function getWeightEntries(ownerUid?: string): Promise<WeightEntry[]> {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, query, where, getDocs } = firebase as any;

  const owner = ownerUid ?? await getOwnerUid();
  const col = collection(db, COLLECTION);

  // Query both `owner` and `userID` fields for backward compatibility
  const qOwner = query(col, where('owner', '==', owner));
  const qUser = query(col, where('userID', '==', owner));

  const [snapOwner, snapUser] = await Promise.all([getDocs(qOwner), getDocs(qUser)]);

  const entries = mergeEntries(snapOwner.docs, snapUser.docs);
  console.debug(`getWeightEntries: owner=${owner} found=${entries.length}`);

  return entries;
}

export async function addWeightEntry(entry: Omit<WeightEntry, "id">): Promise<WeightEntry> {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, addDoc } = firebase as any;
  const owner = await getOwnerUid();
  const col = collection(db, COLLECTION);
  // Persist both `owner` (used by existing queries) and `userID` (explicit field requested)
  const payload = normalizeWeightToLb({ ...entry, owner, userID: owner } as any);
  const docRef = await addDoc(col, payload);
  return { id: docRef.id, ...entry } as WeightEntry;
}

export async function updateWeightEntry(id: string, patch: Partial<WeightEntry>): Promise<WeightEntry | null> {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { doc, setDoc, getDoc } = firebase as any;
  const ref = doc(db, COLLECTION, id);
  await setDoc(ref, patch, { merge: true });
  const updatedSnap = await getDoc(ref);
  if (!updatedSnap.exists()) return null;
  return { id: updatedSnap.id, ...updatedSnap.data() } as WeightEntry;
}

export async function deleteWeightEntry(id: string): Promise<boolean> {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { doc, deleteDoc } = firebase as any;
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
  return true;
}

/**
 * Real-time subscription to weight entries for current owner
 * Subscribes to two queries and merges results
 * Returns an unsubscribe function
 */
export async function subscribeToWeightEntries(
  callback: (items: WeightEntry[]) => void,
  ownerUid?: string
) {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, query, where, onSnapshot } = firebase as any;

  const owner = ownerUid ?? await getOwnerUid();
  const col = collection(db, COLLECTION);

  // Queries for both fields (backward compatibility)
  const qOwner = query(col, where('owner', '==', owner));
  const qUser = query(col, where('userID', '==', owner));

  // Maintains state from both listeners
  let ownerDocs: any[] = [];
  let userDocs: any[] = [];

  /**
   * Single responsibility: Merge and emit latest data
   */
  const emitMergedEntries = () => {
    const merged = mergeEntries(ownerDocs, userDocs);
    console.debug(
      `subscribeToWeightEntries: owner=${owner} ownerDocs=${ownerDocs.length} userDocs=${userDocs.length} merged=${merged.length}`
    );
    callback(merged);
  };

  /**
   * Handles snapshot errors
   */
  const handleError = (error: any, source: string) => {
    console.error(`subscribeToWeightEntries ${source} error:`, error);
  };

  // Setup listeners
  const unsubOwner = onSnapshot(
    qOwner,
    (snap: any) => {
      ownerDocs = snap.docs;
      emitMergedEntries();
    },
    (err: any) => handleError(err, 'owner')
  );

  const unsubUser = onSnapshot(
    qUser,
    (snap: any) => {
      userDocs = snap.docs;
      emitMergedEntries();
    },
    (err: any) => handleError(err, 'userID')
  );

  // Return unsubscribe function
  return () => {
    try {
      unsubOwner();
    } catch (e) {
      // Unsubscribe error, safe to ignore
    }
    try {
      unsubUser();
    } catch (e) {
      // Unsubscribe error, safe to ignore
    }
  };
}

/**
 * Batch-add multiple entries in a single write batch.
 */
export async function batchAddWeightEntries(entries: Omit<WeightEntry, 'id'>[]) {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, doc, writeBatch } = firebase as any;
  const owner = await getOwnerUid();
  const col = collection(db, COLLECTION);
  const batch = writeBatch(db);
  for (const entry of entries) {
    const dref = doc(col);
    const payload = normalizeWeightToLb({ ...entry, owner, userID: owner } as any);
    batch.set(dref, payload);
  }
  await batch.commit();
}
