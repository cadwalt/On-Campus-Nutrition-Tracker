import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock resolveFirebase which the service uses
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('../lib/resolveFirebase', () => {
  return {
    resolveFirebase: async () => ({
      db: {},
      firestore: {
        doc: (...args: any[]) => ({ path: args.join('/') }),
        getDoc: mockGetDoc,
        updateDoc: mockUpdateDoc,
        setDoc: mockSetDoc,
        collection: (...args: any[]) => ({ path: args.join('/') }),
        getDocs: async (ref: any) => ({ size: 0, forEach: () => {} }),
      },
    }),
  };
});

import { getFavoritesForUser, addFavoriteForUser, removeFavoriteForUser } from '../components/services/favoritesService';
import type { FavoriteItem } from '../types/favorite';

function makeSnap(data: any) {
  return {
    exists: () => data != null,
    data: () => data,
  };
}

beforeEach(() => {
  mockGetDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockSetDoc.mockReset();
});

describe('favoritesService', () => {
  it('returns empty array when user doc missing', async () => {
    mockGetDoc.mockResolvedValue(makeSnap(null));
    const res = await getFavoritesForUser('uid1');
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  it('converts legacy favorites string array to structured favorites', async () => {
    mockGetDoc.mockResolvedValue(makeSnap({ favorites: ['Taco', 'Caesar Salad'] }));
    const res = await getFavoritesForUser('uid2');
    expect(res.length).toBe(2);
    expect(res[0].name).toBe('Taco');
    expect(res[1].name).toBe('Caesar Salad');
  });

  it('throws when adding a duplicate favorite (case-insensitive)', async () => {
    const existing: FavoriteItem[] = [{ id: '1', name: 'Taco', source: 'manual', created_at: Date.now() }];
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: existing }));

    const newFav: FavoriteItem = { id: '2', name: 'taco', source: 'manual', created_at: Date.now() };

    await expect(addFavoriteForUser('uid3', newFav)).rejects.toThrow('Favorite already exists');
  });

  it('adds a favorite successfully when not duplicate', async () => {
    mockGetDoc.mockResolvedValue(makeSnap({}));
    mockUpdateDoc.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);

    const newFav: FavoriteItem = { id: 'f1', name: 'Poke Bowl', source: 'manual', created_at: Date.now() };
    const updated = await addFavoriteForUser('uid4', newFav);

    expect(mockUpdateDoc).toHaveBeenCalled();
    expect(Array.isArray(updated)).toBe(true);
    expect((updated as FavoriteItem[]).some((f) => f.name === 'Poke Bowl')).toBe(true);
  });

  it('removes a favorite by id', async () => {
    const existing: FavoriteItem[] = [
      { id: 'a', name: 'Taco', source: 'manual', created_at: Date.now() },
      { id: 'b', name: 'Salad', source: 'manual', created_at: Date.now() },
    ];
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: existing }));
    mockUpdateDoc.mockResolvedValue(undefined);
    mockSetDoc.mockResolvedValue(undefined);

    const updated = await removeFavoriteForUser('uid5', 'a');
    expect(Array.isArray(updated)).toBe(true);
    expect((updated as FavoriteItem[]).length).toBe(1);
    expect((updated as FavoriteItem[])[0].id).toBe('b');
  });
});
