export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  // Optional extended nutrition fields
  sodium?: number;
  sugars?: number;
  calcium?: number;
  iron?: number;
  // Optional textual/other fields to mirror Add-a-Meal
  fatCategories?: string;
  vitamins?: string;
  otherInfo?: string;
}

export interface FavoriteItem {
  id: string;
  name: string;
  source?: 'manual' | 'meal' | 'import';
  nutrition?: NutritionInfo;
  // Human-readable serving size (e.g. "1 bowl", "150 g")
  servingSize?: string;
  tags?: string[];
  created_at?: number;
}

export type FavoritesCollection = FavoriteItem[];

// (No default export) Use the named export `FavoriteItem` where needed.
