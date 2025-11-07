export type NutritionValues = {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
};

// Basic keyword-based nutrition estimation per "standard serving".
// These are approximate default values for common items. If nothing
// matches, we return a sensible default for a mixed meal.
export function estimateNutritionForItem(name: string): NutritionValues {
  const s = name.toLowerCase();

  // helper to scale by number of servings if user wrote e.g. "2 eggs"
  // not implemented here, we just pick by keywords

  if (s.includes('chicken')) {
    return { calories: 250, protein: 28, carbs: 0, fat: 12 };
  }
  if (s.includes('beef') || s.includes('steak')) {
    return { calories: 320, protein: 26, carbs: 0, fat: 22 };
  }
  if (s.includes('pork')) {
    return { calories: 300, protein: 24, carbs: 0, fat: 20 };
  }
  if (s.includes('fish') || s.includes('salmon') || s.includes('tuna')) {
    return { calories: 240, protein: 26, carbs: 0, fat: 14 };
  }
  if (s.includes('egg')) {
    return { calories: 78, protein: 6, carbs: 0.6, fat: 5 };
  }
  if (s.includes('oat') || s.includes('oatmeal')) {
    return { calories: 160, protein: 6, carbs: 27, fat: 3 };
  }
  if (s.includes('rice')) {
    return { calories: 205, protein: 4, carbs: 45, fat: 0.4 };
  }
  if (s.includes('pasta')) {
    return { calories: 220, protein: 8, carbs: 43, fat: 1.3 };
  }
  if (s.includes('salad')) {
    // assume a dressed salad with protein-light
    return { calories: 180, protein: 4, carbs: 12, fat: 12 };
  }
  if (s.includes('bread') || s.includes('toast')) {
    return { calories: 80, protein: 3, carbs: 14, fat: 1 };
  }
  if (s.includes('yogurt')) {
    return { calories: 150, protein: 8, carbs: 18, fat: 4 };
  }
  if (s.includes('smoothie')) {
    return { calories: 280, protein: 6, carbs: 45, fat: 6 };
  }
  if (s.includes('banana') || s.includes('apple') || s.includes('fruit')) {
    return { calories: 95, protein: 1, carbs: 25, fat: 0.3 };
  }
  if (s.includes('chips') || s.includes('fries') || s.includes('snack')) {
    return { calories: 250, protein: 3, carbs: 30, fat: 12 };
  }

  // Generic mixed meal fallback
  return { calories: 400, protein: 18, carbs: 40, fat: 18 };
}
