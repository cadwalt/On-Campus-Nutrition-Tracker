import { getNutritionInfo, NutritionClient } from "../services/nutrition";

const okClient: NutritionClient = async (q) => {
  if (q === "banana") {
    return { food: "banana", calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.3 };
  }
  const err: any = new Error("Not found");
  err.status = 404;
  throw err;
};

describe("getNutritionInfo", () => {
  test("valid item returns normalized nutrition (happy path)", async () => {
    const result = await getNutritionInfo("banana", okClient);
    expect(result).toEqual({ calories: 105, protein: 1.3, carbs: 27, fat: 0.3 });
  });

  test("trims/normalizes input before calling client", async () => {
    const spyClient: NutritionClient = jest.fn(async (q) => {
      expect(q).toBe("banana"); // proves normalization
      return { food: "banana", calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.3 };
    });
    await getNutritionInfo("   BANANA  ", spyClient);
    expect(spyClient).toHaveBeenCalledTimes(1);
  });

  test("empty string is invalid", async () => {
    await expect(getNutritionInfo("", okClient)).rejects.toThrow(/invalid|empty/i);
  });

  test("throws when no client is provided (unit tests shouldn't hit network)", async () => {
    await expect(getNutritionInfo("banana")).rejects.toThrow(/client/i);
  });

  test("404/unknown item surfaces a useful error", async () => {
    await expect(getNutritionInfo("unobtainium sandwich", okClient)).rejects.toThrow(/not|404/i);
  });

  test("malformed API payload is rejected (schema check)", async () => {
    const badClient: NutritionClient = async () =>
      // missing protein_g/carbs_g/fat_g numbers
      ({ food: "banana", calories: NaN } as any);
    await expect(getNutritionInfo("banana", badClient)).rejects.toThrow(/malformed/i);
  });
});
