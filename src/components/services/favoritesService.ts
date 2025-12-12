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

  // Basic server-side guards
  const name = String(fav.name || '').trim();
  if (!name) throw new Error('Favorite name is required');
  if (name.length > 200) throw new Error('Favorite name too long');
  if (fav.servingSize !== undefined) {
    const s = String(fav.servingSize || '').trim();
    if (!s) throw new Error('Serving size is required');
    if (s.length > 200) throw new Error('Serving size too long');
  }
  const checkNum = (n: any, label: string) => {
    if (n == null) return; // optional
    const v = Number(n);
    if (!Number.isFinite(v) || v < 0) throw new Error(`${label} must be a non-negative number`);
    if ((label === 'Calories' && v > 5000) || (label !== 'Calories' && v > 10000)) throw new Error(`${label} value too large`);
  };
  checkNum(fav.nutrition?.calories, 'Calories');
  checkNum(fav.nutrition?.protein, 'Protein');
  checkNum(fav.nutrition?.carbs, 'Carbs');
  checkNum(fav.nutrition?.fat, 'Fat');
  checkNum(fav.nutrition?.sodium, 'Sodium');
  checkNum(fav.nutrition?.sugars, 'Sugars');
  checkNum(fav.nutrition?.calcium, 'Calcium');
  checkNum(fav.nutrition?.iron, 'Iron');

  const updated = [...existing, { ...fav, name }];
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

export async function updateFavoriteForUser(uid: string, favId: string, partial: Partial<FavoriteItem>) {
  const { db, firestore } = await resolveFirebase();
  const userDocRef = firestore.doc(db, 'users', uid);
  const snap = await firestore.getDoc(userDocRef);
  const data = snap.exists() ? snap.data() : {};
  const existing: FavoriteItem[] = Array.isArray(data?.favorites_v2) ? data.favorites_v2 : (Array.isArray(data?.favorites) ? data.favorites.map((n: string, i: number) => ({ id: `legacy_${i}_${n.replace(/\s+/g, '_')}`, name: n, source: 'manual', created_at: Date.now() })) : []);

  // Validate incoming partials
  if (partial.name !== undefined) {
    const name = String(partial.name || '').trim();
    if (!name) throw new Error('Favorite name cannot be empty');
    if (name.length > 200) throw new Error('Favorite name too long');
    partial.name = name;
  }
  if (partial.servingSize !== undefined) {
    const s = String(partial.servingSize || '').trim();
    if (!s) throw new Error('Serving size cannot be empty');
    if (s.length > 200) throw new Error('Serving size too long');
    partial.servingSize = s;
  }
  if (partial.nutrition) {
    const enforceNum = (val: any, label: string) => {
      if (val === undefined) return undefined;
      const num = Number(val);
      if (!Number.isFinite(num) || num < 0) throw new Error(`${label} must be a non-negative number`);
      if ((label === 'Calories' && num > 5000) || (label !== 'Calories' && num > 10000)) throw new Error(`${label} value too large`);
      return num;
    };
    const n = partial.nutrition;
    if (n.calories !== undefined) n.calories = enforceNum(n.calories, 'Calories')!;
    if (n.protein !== undefined) n.protein = enforceNum(n.protein, 'Protein')!;
    if (n.carbs !== undefined) n.carbs = enforceNum(n.carbs, 'Carbs')!;
    if (n.fat !== undefined) n.fat = enforceNum(n.fat, 'Fat')!;
    if (n.sodium !== undefined) n.sodium = enforceNum(n.sodium, 'Sodium')!;
    if (n.sugars !== undefined) n.sugars = enforceNum(n.sugars, 'Sugars')!;
    if (n.calcium !== undefined) n.calcium = enforceNum(n.calcium, 'Calcium')!;
    if (n.iron !== undefined) n.iron = enforceNum(n.iron, 'Iron')!;
  }

  const updated = existing.map((f) => f.id === favId ? { ...f, ...partial, nutrition: { ...(f.nutrition || {}), ...(partial.nutrition || {}) } } : f);

  await firestore.updateDoc(userDocRef, { favorites_v2: updated, updated_at: new Date() }).catch(async (_err: any) => {
    await firestore.setDoc(userDocRef, { favorites_v2: updated, updated_at: new Date() }, { merge: true });
  });

  return updated;
}
