import type { WeightEntry } from "../types/weight";
import { getFirestoreClient, getAuthClient } from "../firebase";

<<<<<<< HEAD
// Constants - avoid magic numbers
const COLLECTION = "weight";
const KG_TO_LB = 2.20462;
const AUTH_TIMEOUT_MS = 5000;
const FALLBACK_OWNER = "local";

/**
 * Single responsibility: Normalize legacy weight data format
 * Converts weightKg to weightLb for backward compatibility
=======
// Firestore collection name
const COLLECTION = "weight";

// Conversion factor from kg to lb
const KG_TO_LB = 2.20462;

/**
 * Normalize weight data by converting weightKg to weightLb if needed.
 * This handles legacy documents that may have used weightKg.
 * Modifies the object in place and returns it for convenience.
>>>>>>> 3449604f23503c51d893151942e46f034bb45a8d
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

<<<<<<< HEAD
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
=======
async function getOwnerUid(): Promise<string> {
  try {
    const auth = await getAuthClient();
    const user = auth?.currentUser;
    if (user && user.uid) return user.uid;

    // If currentUser is not yet set, wait briefly for auth state to initialize.
    // This avoids falling back to the literal 'local' owner before the SDK
    // finishes restoring the signed-in user.
    const firebaseAuth = await import('firebase/auth');
    const { onAuthStateChanged } = firebaseAuth as any;
    return await new Promise<string>((resolve) => {
      let resolved = false;
        // safety timeout: don't wait forever
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.debug('getOwnerUid: auth state wait timed out, falling back to local');
            resolve('local');
          }
        }, 5000);

      let unsub: any = null;
      unsub = onAuthStateChanged(auth, (u: any) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try { unsub(); } catch (e) {}
        resolve(u?.uid ?? 'local');
      });
    });
  } catch (e) {
    // If auth isn't initialized or unavailable, fall back to "local"
    return "local";
  }
}

export async function getWeightEntries(ownerUid?: string): Promise<WeightEntry[]> {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, query, where, orderBy, getDocs } = firebase as any;
  const owner = ownerUid ?? await getOwnerUid();
  const col = collection(db, COLLECTION);
  // Query both `owner` and `userID` to include legacy documents that only used `userID`.
  // Avoid requiring a composite index by not ordering at the query level.
  // We'll sort client-side by `date` instead.
  const qOwner = query(col, where('owner', '==', owner));
  const qUser = query(col, where('userID', '==', owner));
  const [snapOwner, snapUser] = await Promise.all([getDocs(qOwner), getDocs(qUser)]);
  const map = new Map<string, any>();
  const pushDoc = (d: any) => {
    const data = normalizeWeightToLb(d.data());
    if (!map.has(d.id)) map.set(d.id, { id: d.id, ...data });
  };

  snapOwner.docs.forEach(pushDoc);
  snapUser.docs.forEach(pushDoc);
  const items: WeightEntry[] = Array.from(map.values()).sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
  console.debug(`getWeightEntries: owner=${owner} found=${items.length}`);
  return items;
>>>>>>> 3449604f23503c51d893151942e46f034bb45a8d
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
<<<<<<< HEAD
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
=======
 * Real-time subscription to weight entries for current owner.
 * callback will be invoked with the latest ordered list whenever data changes.
 * Returns an unsubscribe function.
 */
export async function subscribeToWeightEntries(callback: (items: WeightEntry[]) => void, ownerUid?: string) {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, query, where, orderBy, onSnapshot } = firebase as any;
  const owner = ownerUid ?? await getOwnerUid();
  const col = collection(db, COLLECTION);
  // Listen to both `owner` and `userID` queries and merge results so legacy docs are included
  // Avoid ordering at the query level to prevent needing composite indexes.
  const qOwner = query(col, where('owner', '==', owner));
  const qUser = query(col, where('userID', '==', owner));

  // Keep latest results from each snapshot and emit merged list on any change
  let ownerDocs: any[] = [];
  let userDocs: any[] = [];

  const emit = () => {
    const map = new Map<string, any>();
    const push = (d: any) => {
      const data = normalizeWeightToLb(d.data());
      if (!map.has(d.id)) map.set(d.id, { id: d.id, ...data });
    };
    ownerDocs.forEach(push);
    userDocs.forEach(push);
    const items: WeightEntry[] = Array.from(map.values()).sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
    console.debug(`subscribeToWeightEntries: owner=${owner} ownerDocs=${ownerDocs.length} userDocs=${userDocs.length} merged=${items.length}`);
    callback(items);
  };

  const unsubOwner = onSnapshot(qOwner, (snap: any) => {
    ownerDocs = snap.docs;
    emit();
  }, (err: any) => {
    console.error('subscribeToWeightEntries owner error', err);
  });

  const unsubUser = onSnapshot(qUser, (snap: any) => {
    userDocs = snap.docs;
    emit();
  }, (err: any) => {
    console.error('subscribeToWeightEntries userID error', err);
  });

  return () => {
    try { unsubOwner(); } catch (e) {}
    try { unsubUser(); } catch (e) {}
>>>>>>> 3449604f23503c51d893151942e46f034bb45a8d
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
