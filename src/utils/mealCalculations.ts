// Meal calculation utilities

import type { Meal } from '../types/meal';

/**
 * Calculate the actual calories consumed based on servings had
 * @param meal - The meal object
 * @returns Total calories (calories per serving × servings had)
 */
export const calculateActualCalories = (meal: Meal): number => {
  const baseCalories = meal.calories || 0;
  const servings = meal.servingsHad || 1; // Default to 1 serving if not specified
  return Math.round(baseCalories * servings);
};

/**
 * Calculate actual macros based on servings had
 * @param meal - The meal object
 * @returns Object with adjusted protein, carbs, and fat values
 */
export const calculateActualMacros = (meal: Meal) => {
  const servings = meal.servingsHad || 1;
  return {
    protein: meal.protein ? Math.round(meal.protein * servings * 10) / 10 : undefined,
    carbs: meal.totalCarbs ? Math.round(meal.totalCarbs * servings * 10) / 10 : undefined,
    fat: meal.totalFat ? Math.round(meal.totalFat * servings * 10) / 10 : undefined,
  };
};

/**
 * Calculate actual micronutrients based on servings had
 * @param meal - The meal object
 * @returns Object with adjusted micronutrient values
 */
export const calculateActualMicros = (meal: Meal) => {
  const servings = meal.servingsHad || 1;
  // keep scaling reusable to treat unspecified values as undefined
  const scale = (val?: number) =>
    val !== undefined ? Math.round(val * servings * 10) / 10 : undefined;

  return {
    // micronutrients scale with servings just like macros do
    sodium: scale(meal.sodium),
    sugars: scale(meal.sugars),
    calcium: scale(meal.calcium),
    iron: scale(meal.iron),
  };
};
