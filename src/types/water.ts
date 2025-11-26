import type { Timestamp } from 'firebase/firestore';

export interface WaterLog {
  id?: string;
  userId: string;
  amountMl: number; // store in milliliters for consistency
  createdAt: Timestamp | Date | number;
  source?: 'quick' | 'custom' | 'bottle';
  bottleId?: string; // ID of saved bottle if used
}

export type BottleIcon = 'cup' | 'drink' | 'bottle';

export interface WaterBottle {
  id: string;
  name: string;
  amountMl: number; // stored in milliliters for consistency
  icon?: BottleIcon; // icon type: cup (small), drink (medium), bottle (large)
  useCount?: number; // track how often it's used for sorting
  createdAt: Timestamp | Date | number;
}

/**
 * Determines the appropriate icon based on bottle size
 * Small: < 16 oz (< 473 ml) -> cup
 * Medium: 16-32 oz (473-946 ml) -> drink
 * Large: > 32 oz (> 946 ml) -> bottle
 */
export function getBottleIconBySize(amountMl: number): BottleIcon {
  const amountOz = mlToOz(amountMl);
  if (amountOz < 16) return 'cup';
  if (amountOz <= 32) return 'drink';
  return 'bottle';
}

export function mlToOz(ml: number): number {
  return Math.round((ml / 29.5735) * 10) / 10; // 1 decimal place
}

export function ozToMl(oz: number): number {
  return Math.round(oz * 29.5735);
}
