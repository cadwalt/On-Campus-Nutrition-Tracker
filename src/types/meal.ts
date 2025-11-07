import type { Timestamp } from 'firebase/firestore';

export interface Meal {
  id?: string;
  userId: string;
  name: string;
  calories: number;
  servingSize: string;
  servingsHad?: number; // number of servings consumed (e.g., 1.5 servings)
  totalCarbs?: number;
  totalFat?: number;
  protein?: number;
  fatCategories?: string; // free text to capture saturated/unsaturated notes
  sodium?: number;
  sugars?: number;
  calcium?: number;
  vitamins?: string; // free text list of vitamin types
  iron?: number;
  otherInfo?: string; // any additional notes
  createdAt: Timestamp | Date | number;
}
