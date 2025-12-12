// Nutrition Goals Constants and Validation

import type { GoalOption, ActivityLevel, NutritionGoals } from '../types/nutrition';

export interface ValidationError {
  field: string;
  message: string;
}

// Goal options with visual and descriptive information
export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'lose_weight',
    title: 'Lose Weight',
    description: 'Create a calorie deficit to reduce body fat',
    icon: '📉',
    color: '#e74c3c',
    recommended_macro_split: {
      protein_percentage: 30,
      carbs_percentage: 40,
      fat_percentage: 30
    }
  },
  {
    id: 'gain_weight',
    title: 'Gain Weight',
    description: 'Increase calorie intake for healthy weight gain',
    icon: '📈',
    color: '#3498db',
    recommended_macro_split: {
      protein_percentage: 25,
      carbs_percentage: 50,
      fat_percentage: 25
    }
  },
  {
    id: 'gain_muscle',
    title: 'Build Muscle',
    description: 'Focus on protein and strength training',
    icon: '💪',
    color: '#f39c12',
    recommended_macro_split: {
      protein_percentage: 35,
      carbs_percentage: 35,
      fat_percentage: 30
    }
  },
  {
    id: 'maintain_weight',
    title: 'Maintain Weight',
    description: 'Keep your current weight and body composition',
    icon: '⚖️',
    color: '#27ae60',
    recommended_macro_split: {
      protein_percentage: 25,
      carbs_percentage: 45,
      fat_percentage: 30
    }
  },
  {
    id: 'improve_endurance',
    title: 'Improve Endurance',
    description: 'Enhance cardiovascular fitness and stamina',
    icon: '🏃',
    color: '#9b59b6',
    recommended_macro_split: {
      protein_percentage: 20,
      carbs_percentage: 60,
      fat_percentage: 20
    }
  },
  {
    id: 'general_health',
    title: 'General Health',
    description: 'Focus on overall wellness and balanced nutrition',
    icon: '🌱',
    color: '#2ecc71',
    recommended_macro_split: {
      protein_percentage: 25,
      carbs_percentage: 45,
      fat_percentage: 30
    }
  }
];

// Activity level options with descriptions
export const ACTIVITY_LEVELS: { id: ActivityLevel; label: string; description: string; multiplier: number }[] = [
  {
    id: 'sedentary',
    label: 'Sedentary',
    description: 'Little to no exercise, desk job',
    multiplier: 1.2
  },
  {
    id: 'lightly_active',
    label: 'Lightly Active',
    description: 'Light exercise 1-3 days/week',
    multiplier: 1.375
  },
  {
    id: 'moderately_active',
    label: 'Moderately Active',
    description: 'Moderate exercise 3-5 days/week',
    multiplier: 1.55
  },
  {
    id: 'very_active',
    label: 'Very Active',
    description: 'Heavy exercise 6-7 days/week',
    multiplier: 1.725
  },
  {
    id: 'extremely_active',
    label: 'Extremely Active',
    description: 'Very heavy exercise, physical job',
    multiplier: 1.9
  }
];

// Dietary restriction options
export const DIETARY_RESTRICTIONS = [
  { id: 'vegan', label: 'Vegan', description: 'No animal products' },
  { id: 'vegetarian', label: 'Vegetarian', description: 'No meat or fish' },
  { id: 'keto', label: 'Keto', description: 'Low carb, high fat' },
  { id: 'paleo', label: 'Paleo', description: 'Whole foods, no processed' },
  { id: 'mediterranean', label: 'Mediterranean', description: 'Heart-healthy fats' },
  { id: 'low_carb', label: 'Low Carb', description: 'Reduced carbohydrates' },
  { id: 'high_protein', label: 'High Protein', description: 'Increased protein intake' },
  { id: 'gluten_free', label: 'Gluten Free', description: 'No gluten-containing foods' },
  { id: 'dairy_free', label: 'Dairy Free', description: 'No dairy products' }
];

// Cooking skill levels
export const COOKING_SKILLS = [
  { id: 'beginner', label: 'Beginner', description: 'Basic cooking skills' },
  { id: 'intermediate', label: 'Intermediate', description: 'Comfortable with most recipes' },
  { id: 'advanced', label: 'Advanced', description: 'Expert cooking abilities' }
];

// Validation functions
export const validateNutritionGoals = (goals: Partial<NutritionGoals>): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!goals.primary_goal) {
    errors.push({ field: 'primary_goal', message: 'Please select a primary goal' });
  }

  if (!goals.activity_level) {
    errors.push({ field: 'activity_level', message: 'Please select your activity level' });
  }

  // Weight validation
  if (goals.current_weight !== undefined) {
    if (goals.current_weight < 50 || goals.current_weight > 500) {
      errors.push({ field: 'current_weight', message: 'Current weight must be between 50 and 500 pounds' });
    }
  }

  if (goals.target_weight !== undefined) {
    if (goals.target_weight < 50 || goals.target_weight > 500) {
      errors.push({ field: 'target_weight', message: 'Target weight must be between 50 and 500 pounds' });
    }
  }

  // Weight goal logic validation
  if (goals.current_weight && goals.target_weight) {
    if (goals.primary_goal === 'lose_weight' && goals.target_weight >= goals.current_weight) {
      errors.push({ field: 'target_weight', message: 'Target weight should be less than current weight for weight loss' });
    }
    if (goals.primary_goal === 'gain_weight' && goals.target_weight <= goals.current_weight) {
      errors.push({ field: 'target_weight', message: 'Target weight should be greater than current weight for weight gain' });
    }
  }

  // Height validation
  if (goals.height !== undefined) {
    if (goals.height < 36 || goals.height > 96) {
      errors.push({ field: 'height', message: 'Height must be between 36 and 96 inches' });
    }
  }

  // Macro targets validation
  if (goals.macro_targets) {
    const { protein_percentage, carbs_percentage, fat_percentage } = goals.macro_targets;
    const total = protein_percentage + carbs_percentage + fat_percentage;
    
    if (Math.abs(total - 100) > 1) { // Allow 1% tolerance for rounding
      errors.push({ field: 'macro_targets', message: 'Macro percentages must add up to 100%' });
    }

    if (protein_percentage < 10 || protein_percentage > 50) {
      errors.push({ field: 'protein_percentage', message: 'Protein percentage should be between 10% and 50%' });
    }
    if (carbs_percentage < 20 || carbs_percentage > 70) {
      errors.push({ field: 'carbs_percentage', message: 'Carb percentage should be between 20% and 70%' });
    }
    if (fat_percentage < 15 || fat_percentage > 50) {
      errors.push({ field: 'fat_percentage', message: 'Fat percentage should be between 15% and 50%' });
    }
  }

  // Meal frequency validation
  if (goals.preferences?.meal_frequency !== undefined) {
    if (goals.preferences.meal_frequency < 1 || goals.preferences.meal_frequency > 8) {
      errors.push({ field: 'meal_frequency', message: 'Meal frequency should be between 1 and 8 meals per day' });
    }
  }

  return errors;
};

// Helper function to calculate BMI
export const calculateBMI = (weight: number, height: number): number => {
  return (weight / (height * height)) * 703; // Formula for pounds and inches
};

// Helper function to get BMI category
export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

// Helper function to calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
export const calculateBMR = (weight: number, height: number, age: number, isMale: boolean): number => {
  if (isMale) {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
};

// Helper function to calculate TDEE (Total Daily Energy Expenditure)
export const calculateTDEE = (bmr: number, activityLevel: ActivityLevel): number => {
  const activityMultiplier = ACTIVITY_LEVELS.find(level => level.id === activityLevel)?.multiplier || 1.2;
  return bmr * activityMultiplier;
};
