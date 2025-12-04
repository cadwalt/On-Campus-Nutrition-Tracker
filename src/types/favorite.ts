export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FavoriteItem {
  id: string;
  name: string;
  source?: 'manual' | 'meal' | 'import';
  nutrition?: NutritionInfo;
  tags?: string[];
  created_at?: number;
}

export type FavoritesCollection = FavoriteItem[];

// (No default export) Use the named export `FavoriteItem` where needed.
