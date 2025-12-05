export interface WeightEntry {
  id: string;
  date: string; // ISO date
  weightLb: number; // store in pounds
}

// Utility functions for weight conversion
export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10;
}
