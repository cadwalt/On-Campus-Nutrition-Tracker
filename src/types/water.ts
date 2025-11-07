import type { Timestamp } from 'firebase/firestore';

export interface WaterLog {
  id?: string;
  userId: string;
  amountMl: number; // store in milliliters for consistency
  createdAt: Timestamp | Date | number;
  source?: 'quick' | 'custom';
}

export function mlToOz(ml: number): number {
  return Math.round((ml / 29.5735) * 10) / 10; // 1 decimal place
}

export function ozToMl(oz: number): number {
  return Math.round(oz * 29.5735);
}
