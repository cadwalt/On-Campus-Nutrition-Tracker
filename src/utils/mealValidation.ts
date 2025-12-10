/**
 * Meal Validation Utility
 * 
 * Centralized validation logic for meal data.
 * Extracted from MealForm and MealDetailsModal to follow DRY (Don't Repeat Yourself) principle.
 * 
 * Benefits:
 * - Single source of truth for validation rules
 * - Easier to maintain and update constraints
 * - Consistent validation across components
 * - Can be reused in server-side validation (Firebase Rules)
 * 
 * Refactoring & Code Quality
 */

/**
 * Validation constants
 * These limits are enforced both client-side and should be mirrored in Firestore security rules
 */
export const MEAL_CONSTRAINTS = {
  MAX_NAME_LENGTH: 100,      // Meal/serving name max length
  MAX_TEXT_LENGTH: 300,      // Notes/description max length
  MAX_CALORIES: 5000,        // Realistic upper bound for a single meal
  MAX_MACRO: 2000,           // Carbs/Fat/Protein per serving
} as const;

/**
 * Meal form data interface for validation
 */
export interface MealValidationData {
  name?: string;
  servingSize?: string;
  calories?: string | number;
  servingsHad?: string | number;
  totalCarbs?: string | number;
  totalFat?: string | number;
  protein?: string | number;
  sodium?: string | number;
  sugars?: string | number;
  calcium?: string | number;
  iron?: string | number;
  otherInfo?: string;
  fatCategories?: string;
  vitamins?: string;
}

/**
 * Validation error with field context
 */
export interface ValidationError {
  field?: string;
  message: string;
}

/**
 * Parse string to number safely
 * Returns undefined if string is empty or invalid
 */
export const parseNumber = (val: string | number): number | undefined => {
  if (typeof val === 'number') return isFinite(val) ? val : undefined;
  if (!val?.toString().trim()) return undefined;
  const n = Number(val);
  return isFinite(n) ? n : undefined;
};

/**
 * Validate meal data for required fields
 * Returns array of missing field names
 * 
 * Input Validation
 */
export const validateRequired = (meal: MealValidationData): string[] => {
  const missing: string[] = [];
  
  if (!meal.name?.trim()) missing.push("Meal name");
  if (!meal.servingSize?.trim()) missing.push("Serving size");
  if (!meal.calories?.toString().trim()) missing.push("Calories");
  
  return missing;
};

/**
 * Validate string field length
 * Prevents DoS attacks via oversized strings
 * 
 * Defense in Depth
 */
export const validateStringLength = (
  value: string | undefined,
  maxLength: number,
  fieldName: string
): string | null => {
  if (!value) return null;
  if (value.length > maxLength) {
    return `${fieldName} must be under ${maxLength} characters.`;
  }
  return null;
};

/**
 * Validate numeric field bounds
 * Ensures values are within realistic and safe ranges
 * 
 * Input Validation
 * Prevents invalid data in database
 */
export const validateNumeric = (
  value: string | number | undefined,
  { min = 0, max, fieldName }: { min?: number; max?: number; fieldName: string }
): string | null => {
  if (!value?.toString().trim()) return null;
  
  const parsed = parseNumber(value);
  if (parsed === undefined || isNaN(parsed)) {
    return `${fieldName} must be a number.`;
  }
  
  if (parsed < min) {
    return `${fieldName} cannot be negative.`;
  }
  
  if (max !== undefined && parsed > max) {
    return `${fieldName} looks too high (>${max}).`;
  }
  
  return null;
};

/**
 * Comprehensive meal validation
 * Validates all fields with appropriate constraints
 * Returns first error found or null if valid
 * 
 * Usage in both MealForm and MealDetailsModal ensures consistency
 * 
 * Refactoring / DRY
 * "If you find you are duplicating code, extract it to a shared function"
 */
export const validateMeal = (meal: MealValidationData): ValidationError | null => {
  // Required field validation
  if (!meal.name?.trim()) return { message: "Meal name is required." };
  if (!meal.servingSize?.trim()) return { message: "Serving size is required." };
  if (!meal.calories?.toString().trim()) return { message: "Calories is required." };

  // String length constraints
  const nameLengthError = validateStringLength(
    meal.name,
    MEAL_CONSTRAINTS.MAX_NAME_LENGTH,
    "Meal name"
  );
  if (nameLengthError) return { field: "name", message: nameLengthError };

  const servingSizeLengthError = validateStringLength(
    meal.servingSize,
    MEAL_CONSTRAINTS.MAX_NAME_LENGTH,
    "Serving size"
  );
  if (servingSizeLengthError) return { field: "servingSize", message: servingSizeLengthError };

  const otherInfoLengthError = validateStringLength(
    meal.otherInfo,
    MEAL_CONSTRAINTS.MAX_TEXT_LENGTH,
    "Notes"
  );
  if (otherInfoLengthError) return { field: "otherInfo", message: otherInfoLengthError };

  // Calories validation (required, must be positive, must be in range)
  const caloriesError = validateNumeric(meal.calories, {
    max: MEAL_CONSTRAINTS.MAX_CALORIES,
    fieldName: "Calories",
  });
  if (caloriesError) return { field: "calories", message: caloriesError };

  // Servings had (optional, must be non-negative if provided)
  const servingsError = validateNumeric(meal.servingsHad, {
    fieldName: "Servings had",
  });
  if (servingsError) return { field: "servingsHad", message: servingsError };

  // Optional numeric macros
  const optionalMacros: Array<[string, string | number | undefined]> = [
    ["Total carbs", meal.totalCarbs],
    ["Total fat", meal.totalFat],
    ["Protein", meal.protein],
    ["Sodium", meal.sodium],
    ["Sugars", meal.sugars],
    ["Calcium", meal.calcium],
    ["Iron", meal.iron],
  ];

  for (const [label, value] of optionalMacros) {
    const max = ["Total carbs", "Total fat", "Protein"].includes(label)
      ? MEAL_CONSTRAINTS.MAX_MACRO
      : undefined;
    
    const error = validateNumeric(value, { max, fieldName: label });
    if (error) return { field: label.toLowerCase().replace(/\s+/g, ""), message: error };
  }

  return null;
};

/**
 * Check if a meal object has unsaved changes vs a baseline
 * Used in MealDetailsModal to warn before closing
 * 
 * Preventing Data Loss
 */
export const hasMealChanges = (
  currentForm: MealValidationData,
  originalMeal: MealValidationData
): boolean => {
  return (
    currentForm.name?.trim() !== originalMeal.name?.trim() ||
    currentForm.servingSize?.trim() !== originalMeal.servingSize?.trim() ||
    currentForm.calories?.toString().trim() !== originalMeal.calories?.toString().trim() ||
    currentForm.servingsHad?.toString().trim() !== originalMeal.servingsHad?.toString().trim() ||
    currentForm.totalCarbs?.toString().trim() !== originalMeal.totalCarbs?.toString().trim() ||
    currentForm.totalFat?.toString().trim() !== originalMeal.totalFat?.toString().trim() ||
    currentForm.protein?.toString().trim() !== originalMeal.protein?.toString().trim() ||
    currentForm.sodium?.toString().trim() !== originalMeal.sodium?.toString().trim() ||
    currentForm.sugars?.toString().trim() !== originalMeal.sugars?.toString().trim() ||
    currentForm.calcium?.toString().trim() !== originalMeal.calcium?.toString().trim() ||
    currentForm.iron?.toString().trim() !== originalMeal.iron?.toString().trim() ||
    currentForm.fatCategories?.trim() !== originalMeal.fatCategories?.trim() ||
    currentForm.vitamins?.trim() !== originalMeal.vitamins?.trim() ||
    currentForm.otherInfo?.trim() !== originalMeal.otherInfo?.trim()
  );
};

/**
 * Sanitize user input to prevent XSS
 * Removes angle brackets that could contain malicious scripts
 * 
 * React escapes by default, but this provides defense-in-depth
 * for data that might be exported or rendered unsafely elsewhere
 * 
 * XSS Prevention
 */
export const sanitizeMealInput = (value: string): string => {
  return value.replace(/[<>]/g, "").trim();
};

/**
 * Sanitize entire meal object
 */
export const sanitizeMeal = (meal: MealValidationData): MealValidationData => {
  return {
    ...meal,
    name: meal.name ? sanitizeMealInput(meal.name) : meal.name,
    servingSize: meal.servingSize ? sanitizeMealInput(meal.servingSize) : meal.servingSize,
    otherInfo: meal.otherInfo ? sanitizeMealInput(meal.otherInfo) : meal.otherInfo,
    fatCategories: meal.fatCategories ? sanitizeMealInput(meal.fatCategories) : meal.fatCategories,
    vitamins: meal.vitamins ? sanitizeMealInput(meal.vitamins) : meal.vitamins,
  };
};
