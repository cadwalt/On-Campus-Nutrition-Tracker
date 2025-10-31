export type Nutrition = {
  calories: number;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
};

type ApiPayload = {
  food: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type NutritionClient = (q: string) => Promise<ApiPayload>;

/**
 * getNutritionInfo
 * Validates input, normalizes query, calls client, returns normalized nutrition.
 * The client is injectable for unit testing.
 */
export async function getNutritionInfo(
  item: string,
  client?: NutritionClient
): Promise<Nutrition> {
  const q = (item ?? "").trim().toLowerCase();
  if (!q) throw new Error("Invalid or empty food name");

  if (!client) {
    // Default throws to ensure tests inject a mock client.
    throw new Error("No nutrition client provided");
  }

  const data = await client(q);

  // Basic data type checks
  if (
    typeof data.calories !== "number" ||
    typeof data.protein_g !== "number" ||
    typeof data.carbs_g !== "number" ||
    typeof data.fat_g !== "number"
  ) {
    throw new Error("Malformed nutrition response");
  }

  return {
    calories: data.calories,
    protein: data.protein_g,
    carbs: data.carbs_g,
    fat: data.fat_g,
  };
}
