import type { NutritionGoals, PrimaryGoal, MacroTargets, ActivityLevel } from '../types/nutrition';
import { GOAL_OPTIONS, ACTIVITY_LEVELS } from '../constants/nutrition';

export interface NutritionPlan {
  maintenanceCalories: number; // estimated maintenance kcal/day
  targetCalories: number; // adjusted by goal
  adjustmentPercent: number; // e.g., -0.15 for 15% deficit
  macroCalories: { protein: number; carbs: number; fat: number };
  macroGrams: { protein: number; carbs: number; fat: number };
  perMeal?: { protein: number; carbs: number; fat: number; calories: number };
  notes: string[];
}

const ROUND = (n: number) => Math.round(n);

function getActivityFactor(level: ActivityLevel): number {
  return ACTIVITY_LEVELS.find(l => l.id === level)?.multiplier ?? 1.2;
}

// When age/sex are unknown, use a pragmatic per-pound heuristic by activity
// Values chosen to roughly match TDEE ranges for college-aged adults
function maintenanceByPounds(weightLb: number, activity: ActivityLevel): number {
  const perLb: Record<ActivityLevel, number> = {
    sedentary: 12,
    lightly_active: 13.5,
    moderately_active: 15,
    very_active: 17,
    extremely_active: 19,
  } as const;
  const factor = perLb[activity] ?? 13.5;
  return weightLb * factor;
}

function defaultMacroSplit(goal: PrimaryGoal): MacroTargets {
  const rec = GOAL_OPTIONS.find(g => g.id === goal)?.recommended_macro_split;
  return (
    rec ?? { protein_percentage: 25, carbs_percentage: 45, fat_percentage: 30 }
  );
}

function goalAdjustment(goal: PrimaryGoal): { percent: number; note: string } {
  switch (goal) {
    case 'lose_weight':
      return { percent: -0.15, note: 'Approx. 15% deficit for gradual fat loss (~0.5 lb/week)' };
    case 'gain_weight':
      return { percent: 0.15, note: 'Approx. 15% surplus for steady weight gain' };
    case 'gain_muscle':
      return { percent: 0.10, note: 'Approx. 10% surplus focused on progressive overload' };
    case 'improve_endurance':
      return { percent: 0.00, note: 'Maintenance calories; consider more carbs on long training days' };
    case 'maintain_weight':
    case 'general_health':
    default:
      return { percent: 0.00, note: 'Maintenance calories for stability' };
  }
}

export function computeNutritionPlan(goals: Partial<NutritionGoals>): NutritionPlan | null {
  if (!goals || !goals.activity_level || !goals.primary_goal) return null;

  const weightLb = goals.current_weight ?? goals.target_weight; // prefer current
  let maintenance = 0;

  if (weightLb) {
    maintenance = maintenanceByPounds(weightLb, goals.activity_level);
  } else {
    // Fallback if weight unknown: anchor to 2000 kcal and scale by activity
    maintenance = 2000 * getActivityFactor(goals.activity_level) / 1.55; // normalize to moderate
  }

  const { percent, note } = goalAdjustment(goals.primary_goal);
  const target = maintenance * (1 + percent);

  const macroPct = goals.macro_targets ?? defaultMacroSplit(goals.primary_goal);

  const kcalProtein = target * (macroPct.protein_percentage / 100);
  const kcalCarbs = target * (macroPct.carbs_percentage / 100);
  const kcalFat = target * (macroPct.fat_percentage / 100);

  const gramsProtein = kcalProtein / 4;
  const gramsCarbs = kcalCarbs / 4;
  const gramsFat = kcalFat / 9;

  const notes: string[] = [note];
  if (!goals.current_weight) notes.push('Current weight missing — using a general estimate.');
  if (!goals.macro_targets) notes.push('Using recommended macro split for your goal.');

  let perMeal;
  const mealsPerDay = goals.preferences?.meal_frequency;
  if (mealsPerDay && mealsPerDay > 0) {
    perMeal = {
      protein: gramsProtein / mealsPerDay,
      carbs: gramsCarbs / mealsPerDay,
      fat: gramsFat / mealsPerDay,
      calories: target / mealsPerDay,
    };
  }

  return {
    maintenanceCalories: ROUND(maintenance),
    targetCalories: ROUND(target),
    adjustmentPercent: percent,
    macroCalories: {
      protein: ROUND(kcalProtein),
      carbs: ROUND(kcalCarbs),
      fat: ROUND(kcalFat),
    },
    macroGrams: {
      protein: ROUND(gramsProtein),
      carbs: ROUND(gramsCarbs),
      fat: ROUND(gramsFat),
    },
    perMeal: perMeal
      ? {
          protein: ROUND(perMeal.protein),
          carbs: ROUND(perMeal.carbs),
          fat: ROUND(perMeal.fat),
          calories: ROUND(perMeal.calories),
        }
      : undefined,
    notes,
  };
}
