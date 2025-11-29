import { resolveFirebase } from '../../lib/resolveFirebase';
import type { NutritionGoals, GoalPreferences } from '../../types/nutrition';
import type { Meal } from '../../types/meal';
import { computeNutritionPlan } from '../../utils/nutritionPlan';
import { calculateActualCalories, calculateActualMacros } from '../../utils/mealCalculations';

export interface SystemContextParams {
  userId: string;
  capabilities: {
    knowsGoals: boolean;
    tracksIntake: boolean;
    personalizedAdvice: boolean;
  };
  timeOfDay: string;
}

export interface NutritionPlan {
  targetCalories: number;
  macroGrams: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Builds the system context string for Nova based on user data and capabilities
 */
export async function buildSystemContext(params: SystemContextParams): Promise<string | undefined> {
  try {
    const { auth, db, firestore } = await resolveFirebase();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return undefined;
    }

    const userRef = firestore.doc(db, 'users', currentUser.uid);
    const snap = await firestore.getDoc(userRef);
    if (!snap.exists()) {
      return undefined;
    }

    const data = snap.data() as any;
    const allergens: string[] = data.allergens || [];
    const ng: Partial<NutritionGoals> = data.nutrition_goals || {};
    const prefs: GoalPreferences | undefined = ng.preferences;

    const parts: string[] = [];
    
    // Assistant identity
    parts.push(`You are Nova, a friendly and knowledgeable nutrition assistant. You help users with personalized nutrition advice, meal planning, and achieving their health goals.`);
    parts.push(`Always introduce yourself as Nova and be conversational, supportive, and encouraging.`);
    parts.push(`IMPORTANT: Always remind users that your advice is for informational purposes only and cannot replace professional medical or nutritionist guidance. When providing nutrition advice, especially for medical conditions, allergies, or significant dietary changes, gently remind users to consult with a healthcare professional or registered dietitian.`);
    
    // User info
    parts.push(`User: ${currentUser.displayName || currentUser.email || 'OU Student'}`);
    
    // Current time context
    parts.push(`Current time: ${params.timeOfDay} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
    
    // Goals (if enabled)
    if (params.capabilities.knowsGoals) {
      if (ng.primary_goal) parts.push(`Primary goal: ${ng.primary_goal}`);
      if (ng.activity_level) parts.push(`Activity level: ${ng.activity_level}`);
      if (ng.current_weight) parts.push(`Current weight: ${ng.current_weight} lbs`);
      if (ng.target_weight) parts.push(`Target weight: ${ng.target_weight} lbs`);
      if (ng.height) parts.push(`Height: ${ng.height} in`);
      
      // Macro targets
      if (ng.macro_targets) {
        parts.push(
          `Macro targets: ${ng.macro_targets.protein_percentage}% protein, ${ng.macro_targets.carbs_percentage}% carbs, ${ng.macro_targets.fat_percentage}% fat`
        );
      }
    }
    
    // Dietary restrictions and preferences (if personalized advice enabled)
    if (params.capabilities.personalizedAdvice) {
      if (allergens.length) parts.push(`Allergies: ${allergens.join(', ')}`);
      if (prefs) {
        const restrictions: string[] = prefs.dietary_restrictions || [];
        if (restrictions.length) parts.push(`Dietary restrictions: ${restrictions.join(', ')}`);
        if (prefs.cooking_skill) parts.push(`Cooking skill: ${prefs.cooking_skill}`);
        if (prefs.meal_frequency) parts.push(`Meal frequency: ${prefs.meal_frequency} per day`);
      }
    }

    // Today's intake and remaining goals (if enabled)
    if (params.capabilities.tracksIntake && ng && Object.keys(ng).length > 0) {
      // Fetch today's meals and calculate intake
      let todayIntake = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      try {
        const mealsQ = firestore.query(
          firestore.collection(db, 'meals'),
          firestore.where('userId', '==', currentUser.uid)
        );
        const mealsSnap = await firestore.getDocs(mealsQ);
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

        const toMillis = (val: any): number => {
          if (typeof val === 'number') return val;
          if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
          if (val instanceof Date) return val.getTime();
          return 0;
        };

        mealsSnap.forEach((docSnap: any) => {
          const meal = docSnap.data() as Meal;
          const ms = toMillis(meal.createdAt);

          if (ms >= startOfToday && ms < endOfToday) {
            todayIntake.calories += calculateActualCalories(meal);
            const macros = calculateActualMacros(meal);
            todayIntake.protein += macros.protein || 0;
            todayIntake.carbs += macros.carbs || 0;
            todayIntake.fat += macros.fat || 0;
          }
        });

        todayIntake = {
          calories: Math.round(todayIntake.calories),
          protein: Math.round(todayIntake.protein * 10) / 10,
          carbs: Math.round(todayIntake.carbs * 10) / 10,
          fat: Math.round(todayIntake.fat * 10) / 10
        };
      } catch (err) {
        console.error('Failed to fetch today\'s meals', err);
      }

      const nutritionPlan = computeNutritionPlan(ng);
      if (nutritionPlan) {
        const remainingCalories = Math.max(0, nutritionPlan.targetCalories - todayIntake.calories);
        const remainingProtein = Math.max(0, nutritionPlan.macroGrams.protein - todayIntake.protein);
        const remainingCarbs = Math.max(0, nutritionPlan.macroGrams.carbs - todayIntake.carbs);
        const remainingFat = Math.max(0, nutritionPlan.macroGrams.fat - todayIntake.fat);

        // Helper function to safely calculate percentage, avoiding division by zero
        const safePercentage = (current: number, target: number): string => {
          if (target === 0 || !isFinite(target)) return 'N/A';
          return `${Math.round((current / target) * 100)}%`;
        };

        parts.push(`\nToday's intake so far:`);
        const caloriesPercent = nutritionPlan.targetCalories > 0 
          ? ` (${safePercentage(todayIntake.calories, nutritionPlan.targetCalories)})` 
          : '';
        parts.push(`- Calories: ${todayIntake.calories} / ${nutritionPlan.targetCalories}${caloriesPercent}`);
        
        const proteinPercent = nutritionPlan.macroGrams.protein > 0 
          ? ` (${safePercentage(todayIntake.protein, nutritionPlan.macroGrams.protein)})` 
          : '';
        parts.push(`- Protein: ${todayIntake.protein}g / ${Math.round(nutritionPlan.macroGrams.protein)}g${proteinPercent}`);
        
        const carbsPercent = nutritionPlan.macroGrams.carbs > 0 
          ? ` (${safePercentage(todayIntake.carbs, nutritionPlan.macroGrams.carbs)})` 
          : '';
        parts.push(`- Carbs: ${todayIntake.carbs}g / ${Math.round(nutritionPlan.macroGrams.carbs)}g${carbsPercent}`);
        
        const fatPercent = nutritionPlan.macroGrams.fat > 0 
          ? ` (${safePercentage(todayIntake.fat, nutritionPlan.macroGrams.fat)})` 
          : '';
        parts.push(`- Fat: ${todayIntake.fat}g / ${Math.round(nutritionPlan.macroGrams.fat)}g${fatPercent}`);
        
        parts.push(`\nRemaining targets for today:`);
        parts.push(`- Calories: ${remainingCalories} remaining`);
        parts.push(`- Protein: ${Math.round(remainingProtein)}g remaining`);
        parts.push(`- Carbs: ${Math.round(remainingCarbs)}g remaining`);
        parts.push(`- Fat: ${Math.round(remainingFat)}g remaining`);
      }
    }

    return parts.join('\n');
  } catch (e) {
    console.error('Failed to build system context', e);
    return undefined;
  }
}

