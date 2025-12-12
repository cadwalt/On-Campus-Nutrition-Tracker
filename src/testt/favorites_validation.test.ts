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

import { addFavoriteForUser, updateFavoriteForUser } from '../components/services/favoritesService';
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

describe('favoritesService validation', () => {
  it('rejects empty favorite name', async () => {
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: [] }));
    const fav: FavoriteItem = { id: 'x', name: '   ', source: 'manual', created_at: Date.now(), servingSize: '1 bowl', nutrition: { calories: 100 } };
    await expect(addFavoriteForUser('uid', fav)).rejects.toThrow('Favorite name is required');
  });

  it('rejects empty serving size', async () => {
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: [] }));
    const fav: FavoriteItem = { id: 'x', name: 'Salad', source: 'manual', created_at: Date.now(), servingSize: '', nutrition: { calories: 100 } };
    await expect(addFavoriteForUser('uid', fav)).rejects.toThrow('Serving size is required');
  });

  it('rejects negative calories', async () => {
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: [] }));
    const fav: FavoriteItem = { id: 'x', name: 'Salad', source: 'manual', created_at: Date.now(), servingSize: '1 bowl', nutrition: { calories: -1 } };
    await expect(addFavoriteForUser('uid', fav)).rejects.toThrow('Calories must be a non-negative number');
  });

  it('rejects non-finite numbers', async () => {
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: [] }));
    const fav: FavoriteItem = { id: 'x', name: 'Salad', source: 'manual', created_at: Date.now(), servingSize: '1 bowl', nutrition: { protein: Number.POSITIVE_INFINITY } };
    await expect(addFavoriteForUser('uid', fav)).rejects.toThrow('Protein must be a non-negative number');
  });

  it('rejects too-large calories', async () => {
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: [] }));
    const fav: FavoriteItem = { id: 'x', name: 'Burger', source: 'manual', created_at: Date.now(), servingSize: '1 burger', nutrition: { calories: 999999 } };
    await expect(addFavoriteForUser('uid', fav)).rejects.toThrow('Calories value too large');
  });

  it('rejects invalid update name/servingSize and negative macros', async () => {
    const existing: FavoriteItem[] = [
      { id: 'a', name: 'Taco', source: 'manual', servingSize: '1 taco', created_at: Date.now(), nutrition: { calories: 300 } },
    ];
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: existing }));

    await expect(updateFavoriteForUser('uid', 'a', { name: '   ' })).rejects.toThrow('Favorite name cannot be empty');
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: existing }));
    await expect(updateFavoriteForUser('uid', 'a', { servingSize: '' })).rejects.toThrow('Serving size cannot be empty');
    mockGetDoc.mockResolvedValue(makeSnap({ favorites_v2: existing }));
    await expect(updateFavoriteForUser('uid', 'a', { nutrition: { protein: -5 } })).rejects.toThrow('Protein must be a non-negative number');
  });
});
