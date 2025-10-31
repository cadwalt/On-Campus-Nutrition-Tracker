import { describe, it, expect, vi } from 'vitest';
import { getNutritionInfo, type NutritionClient } from '../components/services/nutrition';

const okClient: NutritionClient = async (q) => {
  if (q === 'banana') {
    return { food: 'banana', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.3 };
  }
  const err: any = new Error('Not found');
  err.status = 404;
  throw err;
};

describe('getNutritionInfo', () => {
  it('returns normalized nutrition (happy path)', async () => {
    const result = await getNutritionInfo('banana', okClient);
    expect(result).toEqual({ calories: 105, protein: 1.3, carbs: 27, fat: 0.3 });
  });

  it('trims/normalizes input before calling client', async () => {
    const spyClient: NutritionClient = vi.fn(async (q) => {
      expect(q).toBe('banana');
      return { food: 'banana', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.3 };
    });
    await getNutritionInfo('   BANANA  ', spyClient);
    expect(spyClient).toHaveBeenCalledTimes(1);
  });

  it('rejects empty input', async () => {
    await expect(getNutritionInfo('', okClient)).rejects.toThrow(/invalid|empty/i);
  });

  it('rejects when no client provided', async () => {
    // @ts-expect-error intentionally omit client
    await expect(getNutritionInfo('banana')).rejects.toThrow(/client/i);
  });

  it('surfaces not-found errors', async () => {
    await expect(getNutritionInfo('unobtainium sandwich', okClient)).rejects.toThrow(/not|404/i);
  });

  it('rejects malformed API payload', async () => {
    const badClient: NutritionClient = async () => ({ food: 'banana', calories: NaN } as any);
    await expect(getNutritionInfo('banana', badClient)).rejects.toThrow(/malformed/i);
  });
});
