import type { WeightEntry } from "../types/weight";
import { getFirestoreClient, getAuthClient } from "../firebase";

// Firestore collection name
const COLLECTION = "weight_entries";

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
  const docRef = await addDoc(col, { ...entry, owner });
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
    const items: WeightEntry[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
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
    batch.set(dref, { ...entry, owner });
  }
  await batch.commit();
}
