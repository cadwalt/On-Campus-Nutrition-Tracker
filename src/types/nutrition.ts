// Nutrition Goals Types and Interfaces

export type PrimaryGoal = 
  | 'lose_weight' 
  | 'gain_weight' 
  | 'gain_muscle' 
  | 'maintain_weight' 
  | 'improve_endurance' 
  | 'general_health';

export type ActivityLevel = 
  | 'sedentary' 
  | 'lightly_active' 
  | 'moderately_active' 
  | 'very_active' 
  | 'extremely_active';

export type DietaryRestriction = 
  | 'vegan' 
  | 'vegetarian' 
  | 'keto' 
  | 'paleo' 
  | 'mediterranean' 
  | 'low_carb' 
  | 'high_protein' 
  | 'gluten_free' 
  | 'dairy_free';

export type CookingSkill = 'beginner' | 'intermediate' | 'advanced';

export interface MacroTargets {
  protein_percentage: number; // 0-100
  carbs_percentage: number; // 0-100
  fat_percentage: number; // 0-100
}

export interface GoalPreferences {
  dietary_restrictions: DietaryRestriction[];
  meal_frequency: number; // meals per day
  cooking_skill: CookingSkill;
}

export interface NutritionGoals {
  primary_goal: PrimaryGoal;
  target_weight?: number; // in pounds
  current_weight?: number; // in pounds
  height?: number; // in inches
  activity_level: ActivityLevel;
  macro_targets?: MacroTargets;
  preferences?: GoalPreferences;
}

export interface GoalOption {
  id: PrimaryGoal;
  title: string;
  description: string;
  icon: string;
  color: string;
  recommended_macro_split?: MacroTargets;
}
