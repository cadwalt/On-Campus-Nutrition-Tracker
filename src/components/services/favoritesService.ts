import { resolveFirebase } from '../../lib/resolveFirebase';
import type { FavoriteItem } from '../../types/favorite';

// Simple service to read/write structured favorites on the user document.
// Writes to `favorites_v2` array to avoid clobbering legacy `favorites` string array.

export async function getFavoritesForUser(uid: string) {
  const { db, firestore } = await resolveFirebase();
  const userDocRef = firestore.doc(db, 'users', uid);
  const snap = await firestore.getDoc(userDocRef);
  if (!snap.exists()) return [] as FavoriteItem[];
  const data = snap.data() as any;

  // Prefer structured favorites_v2 if present
  if (Array.isArray(data.favorites_v2)) return data.favorites_v2 as FavoriteItem[];

  // Fallback: convert legacy string array to structured favorites
  if (Array.isArray(data.favorites)) {
    return data.favorites.map((name: string, i: number) => ({
      id: `legacy_${i}_${name.replace(/\s+/g, '_')}`,
      name,
      source: 'manual',
      created_at: Date.now(),
    } as FavoriteItem));
  }

  return [] as FavoriteItem[];
}

export async function addFavoriteForUser(uid: string, fav: FavoriteItem) {
  const { db, firestore } = await resolveFirebase();
  const userDocRef = firestore.doc(db, 'users', uid);

  // Read existing structured favorites if any
  const snap = await firestore.getDoc(userDocRef);
  const data = snap.exists() ? snap.data() : {};
  const existing: FavoriteItem[] = Array.isArray(data?.favorites_v2) ? data.favorites_v2 : (Array.isArray(data?.favorites) ? data.favorites.map((n: string, i: number) => ({ id: `legacy_${i}_${n.replace(/\s+/g, '_')}`, name: n, source: 'manual', created_at: Date.now() })) : []);

  // Prevent duplicates by normalized name
  const norm = (s: string) => s.trim().toLowerCase();
  if (existing.some(e => norm(e.name) === norm(fav.name))) {
    throw new Error('Favorite already exists');
  }

  const updated = [...existing, fav];
  await firestore.updateDoc(userDocRef, { favorites_v2: updated, updated_at: new Date() }).catch(async (_err: any) => {
    // If update fails (no doc), set with merge
    await firestore.setDoc(userDocRef, { favorites_v2: updated, updated_at: new Date() }, { merge: true });
  });

  return updated;
}

export async function removeFavoriteForUser(uid: string, favId: string) {
  const { db, firestore } = await resolveFirebase();
  const userDocRef = firestore.doc(db, 'users', uid);
  const snap = await firestore.getDoc(userDocRef);
  if (!snap.exists()) return [] as FavoriteItem[];
  const data = snap.data() as any;
  const existing: FavoriteItem[] = Array.isArray(data?.favorites_v2) ? data.favorites_v2 : (Array.isArray(data?.favorites) ? data.favorites.map((n: string, i: number) => ({ id: `legacy_${i}_${n.replace(/\s+/g, '_')}`, name: n, source: 'manual', created_at: Date.now() })) : []);
  const updated = existing.filter((f) => f.id !== favId);
  await firestore.updateDoc(userDocRef, { favorites_v2: updated, updated_at: new Date() }).catch(async (_err: any) => {
    await firestore.setDoc(userDocRef, { favorites_v2: updated, updated_at: new Date() }, { merge: true });
  });
  return updated;
}
