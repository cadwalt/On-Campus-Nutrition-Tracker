import type { WeightEntry } from "../types/weight";
import { getFirestoreClient, getAuthClient } from "../firebase";

// Firestore collection name
const COLLECTION = "weight";

// Conversion factor from kg to lb
const KG_TO_LB = 2.20462;

/**
 * Normalize weight data by converting weightKg to weightLb if needed.
 * This handles legacy documents that may have used weightKg.
 * Modifies the object in place and returns it for convenience.
 */
function normalizeWeightToLb(data: Record<string, unknown>): Record<string, unknown> {
  if (data.weightKg !== undefined && data.weightLb === undefined) {
    data.weightLb = Math.round((Number(data.weightKg) * KG_TO_LB) * 10) / 10;
    delete data.weightKg;
  }
  return data;
}

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
