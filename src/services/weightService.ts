import type { WeightEntry } from "../types/weight";
import { getFirestoreClient, getAuthClient } from "../firebase";

// Firestore collection name
const COLLECTION = "weight";

async function getOwnerUid(): Promise<string> {
  try {
    const auth = await getAuthClient();
    const user = auth?.currentUser;
    return user?.uid ?? "local";
  } catch (e) {
    // If auth isn't initialized or unavailable, fall back to "local"
    return "local";
  }
}

export async function getWeightEntries(): Promise<WeightEntry[]> {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, query, where, orderBy, getDocs } = firebase as any;
  const owner = await getOwnerUid();
  const col = collection(db, COLLECTION);
  const q = query(col, where('owner', '==', owner), orderBy('date'));
  const snap = await getDocs(q);
  const items: WeightEntry[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  return items;
}

export async function addWeightEntry(entry: Omit<WeightEntry, "id">): Promise<WeightEntry> {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, addDoc } = firebase as any;
  const owner = await getOwnerUid();
  const col = collection(db, COLLECTION);
  // Persist both `owner` (used by existing queries) and `userID` (explicit field requested)
  const payload = { ...entry, owner, userID: owner } as any;
  // If incoming entry uses weightKg (older entries), convert to weightLb for consistency.
  if ((payload as any).weightKg !== undefined && (payload as any).weightLb === undefined) {
    payload.weightLb = Math.round(((payload as any).weightKg * 2.20462) * 10) / 10;
    delete payload.weightKg;
  }
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
export async function subscribeToWeightEntries(callback: (items: WeightEntry[]) => void) {
  const db = await getFirestoreClient();
  const firebase = await import('firebase/firestore');
  const { collection, query, where, orderBy, onSnapshot } = firebase as any;
  const owner = await getOwnerUid();
  const col = collection(db, COLLECTION);
  const q = query(col, where('owner', '==', owner), orderBy('date'));
  const unsubscribe = onSnapshot(q, (snap: any) => {
    const items: WeightEntry[] = snap.docs.map((d: any) => {
      const data = d.data();
      // Normalize older documents that may have weightKg
      if (data.weightKg !== undefined && data.weightLb === undefined) {
        data.weightLb = Math.round((data.weightKg * 2.20462) * 10) / 10;
        delete data.weightKg;
      }
      return { id: d.id, ...data } as WeightEntry;
    });
    callback(items);
  }, (err: any) => {
    console.error('subscribeToWeightEntries error', err);
  });
  return unsubscribe;
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
    const payload: any = { ...entry, owner, userID: owner };
    if (payload.weightKg !== undefined && payload.weightLb === undefined) {
      payload.weightLb = Math.round((payload.weightKg * 2.20462) * 10) / 10;
      delete payload.weightKg;
    }
    batch.set(dref, payload);
  }
  await batch.commit();
}
