import { describe, it, expect, beforeEach } from 'vitest';

// --- Types (Based on screenshots) ---
type UserProfile = {
  userID: string;
  preferences?: Record<string, any> | null; // Allow null
  allergens?: string[] | null;        // Allow null
};

type FoodItem = {
  name: string;
  allergens?: string[];
  nutritionInfo?: {
    calories?: number;
    protein_g?: number;
    // ... other nutrients
  } | null; // Allow null
};

type Menu = {
  restaurantName: string;
  items: (FoodItem | null | undefined)[]; // Allow null/undefined items in list
};

// --- Mocks and Stubs (Based on screenshots) ---

/**
 * Checks if a food item contains any of the user's allergens.
 */
function hasAllergen(foodItem: FoodItem | null | undefined, user: UserProfile | null | undefined): boolean {
  // Handle null/undefined inputs first (Invalid case)
  // Ensure allergens arrays exist and are arrays
  if (!foodItem || !user || !Array.isArray(foodItem.allergens) || !Array.isArray(user.allergens)) {
    return false;
  }
  // Handle empty lists (Boundary case)
  if (foodItem.allergens.length === 0 || user.allergens.length === 0) {
    return false;
  }
  // Check for overlap
  return foodItem.allergens.some(allergen => user.allergens?.includes(allergen));
}

// --- FINAL REFINED meetsFoodCriteria ---
/**
 * Checks if a food item meets the user's dietary criteria (e.g., calorie limits).
 */
function meetsFoodCriteria(foodItem: FoodItem | null | undefined, user: UserProfile | null | undefined): boolean {
    // Handle null/undefined inputs
    if (!foodItem || !user) {
        return true; // Assume true if cannot fail
    }
    // Handle missing/null preferences
    if (!user.preferences || typeof user.preferences !== 'object' || Object.keys(user.preferences).length === 0) {
        return true; // No criteria to fail
    }

    // --- Start actual criteria checking ---
    let meets = true;

    // Define nutrient keys that require the nutritionInfo object
    const requiresNutritionInfoKeys = ['min_protein', 'max_calories' /* add others like 'max_fat' etc. */];
    const userRequiresNutrients = requiresNutritionInfoKeys.some(key => user.preferences && user.preferences[key] !== undefined);


    // --- Check criteria requiring nutritionInfo ---
    // If nutritionInfo is missing or invalid, check if any preferences *require* it.
    if (!foodItem.nutritionInfo || typeof foodItem.nutritionInfo !== 'object') {
        if (userRequiresNutrients) {
            return false; // Cannot meet criteria if nutrition info is required but missing/invalid
        } else {
            return true; // No relevant criteria requiring nutrition info, so it passes by default
        }
    }

    // Now, nutritionInfo EXISTS and is an OBJECT. Check individual criteria.

    // Check max_calories (only if defined in prefs AND food)
    if (user.preferences.max_calories !== undefined && foodItem.nutritionInfo.calories !== undefined) {
         // Ensure calories is a number before comparing
        if (typeof foodItem.nutritionInfo.calories === 'number') {
           meets = meets && foodItem.nutritionInfo.calories <= user.preferences.max_calories;
        } else {
             meets = false; // Invalid calorie data cannot meet max_calories criteria
        }
    }

    // Check min_protein (only if defined in prefs AND 'meets' is still true)
    if (meets && user.preferences.min_protein !== undefined) {
        // MUST have a valid protein_g number >= min_protein to pass
        if (foodItem.nutritionInfo.protein_g === undefined || typeof foodItem.nutritionInfo.protein_g !== 'number' || foodItem.nutritionInfo.protein_g < user.preferences.min_protein) {
            meets = false;
        }
    }

    // Add other criteria checks here, guarded by 'if (meets && ...)'

    return meets;
}
// --- End of FINAL REFINED meetsFoodCriteria ---


// --- Placeholder stubs for other functions mentioned ---
function getUserInfo(userID: string): UserProfile | null { return null; }
function getRestaurantInfo(name: string): Menu | null { return null; }
function startChat(userID: string): string { return "Chat started"; }
function sendRequest(userID: string, message: string): string { return "Request sent"; }
function calculateNutrition(items: FoodItem[]): any { return {}; }
function createMeal(items: FoodItem[]): any { return {}; }
function displayNutritionResponse(nutritionInfo: any): string { return "Displayed"; }

/**
 * Simulates generating suggestions based on user profile and menu.
 * This is a simplified stub. A real implementation would be more complex.
 */
function generateSuggestion(user: UserProfile | null | undefined, menu: Menu | null | undefined): FoodItem[] {
   // Invalid Cases for User - ensure user and essential properties exist
   if (!user || typeof user.userID !== 'string' || user.userID === '' || user.allergens === null || user.preferences === null) {
     return [];
   }
   // Invalid Cases for Menu - ensure menu and items array exist
    if (!menu || !Array.isArray(menu.items)) {
        return [];
    }


   // Filter based on criteria and allergens
   return menu.items.filter(item =>
     item && // Ensure item is not null/undefined before passing to checkers
     !hasAllergen(item, user) &&
     meetsFoodCriteria(item, user) // Use the final refined version
   ) as FoodItem[]; // Cast result to FoodItem[] assuming nulls are filtered
}


// --- Mock Data Setup --- (Remains the same as previous version)
let userValid: UserProfile;
let userInvalidId: UserProfile;
let userNoId: any;
let userAllergicDairyGluten: UserProfile;
let userPrefsStrict: UserProfile;
let userPrefsMaxCalMinProt: UserProfile;
let userPrefsOnlyMinProt: UserProfile;
let userNoAllergensPrefs: UserProfile;
let userNoPrefsAllergens: UserProfile;
let userAllPossibleAllergens: UserProfile;
let userEmptyAllergens: UserProfile;
let userNullParams: UserProfile;


let foodSafeLowCalHighProt: FoodItem;
let foodAllergenDairyGlutenHighCal: FoodItem;
let foodAllergenNutsMidCalMidProt: FoodItem;
let foodHighCalHighProt: FoodItem;
let foodLowCalLowProt: FoodItem;
let foodMeetsStrictPrefs: FoodItem;
let foodNoNutrition: FoodItem;
let foodNoAllergensList: FoodItem;
let foodNullNutrition: FoodItem = { name: 'Null Nutrients', allergens: [], nutritionInfo: null };


let menuValid: Menu;
let menuEmpty: Menu;
let menuNoItems: Menu = { restaurantName: 'No Items Here', items: [] };
let menuWithNullItem: Menu;


beforeEach(() => {
  // Reset mock data before each test (remains the same)
  userValid = { userID: 'user123', preferences: { max_calories: 800, min_protein: 10 }, allergens: ['nuts'] };
  userInvalidId = { userID: '', preferences: { max_calories: 500 }, allergens: [] };
  userNoId = { preferences: { max_calories: 500 }, allergens: [] };
  userAllergicDairyGluten = { userID: 'user456', allergens: ['dairy', 'gluten'] };
  userPrefsStrict = { userID: 'user789', preferences: { max_calories: 150, min_protein: 20 } };
  userPrefsMaxCalMinProt = { userID: 'user101', preferences: { max_calories: 500, min_protein: 20 }, allergens: [] };
  userPrefsOnlyMinProt = { userID: 'user102', preferences: { min_protein: 30 }, allergens: ['soy'] };
  userNoAllergensPrefs = { userID: 'user131', preferences: { max_calories: 1000 }};
  userNoPrefsAllergens = { userID: 'user415', allergens: ['fish'] };
  userAllPossibleAllergens = { userID: 'userAll', allergens: ['dairy', 'gluten', 'nuts', 'soy', 'fish'] };
  userEmptyAllergens = { userID: 'userEmptyAllergy', allergens: [], preferences: { max_calories: 600 } };
  userNullParams = { userID: 'userNulls', preferences: null, allergens: null };


  foodSafeLowCalHighProt = { name: 'Grilled Chicken Salad', allergens: [], nutritionInfo: { calories: 350, protein_g: 30 } };
  foodAllergenDairyGlutenHighCal = { name: 'Pepperoni Pizza', allergens: ['dairy', 'gluten'], nutritionInfo: { calories: 800, protein_g: 25 } };
  foodAllergenNutsMidCalMidProt = { name: 'Pad Thai', allergens: ['nuts', 'soy'], nutritionInfo: { calories: 600, protein_g: 18 } };
  foodHighCalHighProt = { name: 'Double Cheeseburger', allergens: ['gluten', 'dairy'], nutritionInfo: { calories: 950, protein_g: 45 } };
  foodLowCalLowProt = { name: 'Plain Rice', allergens: [], nutritionInfo: { calories: 120, protein_g: 3 } };
  foodMeetsStrictPrefs = { name: 'Steamed Veggies', allergens: [], nutritionInfo: { calories: 100, protein_g: 25 } };
  foodNoNutrition = { name: 'Water', allergens: [] };
  foodNoAllergensList = { name: 'Sugar Cube', nutritionInfo: { calories: 20 } };
  foodNullNutrition = { name: 'Null Nutrients', allergens: [], nutritionInfo: null };


  menuValid = {
    restaurantName: 'The Good Place',
    items: [foodSafeLowCalHighProt, foodAllergenDairyGlutenHighCal, foodAllergenNutsMidCalMidProt, foodHighCalHighProt, foodLowCalLowProt, foodMeetsStrictPrefs, foodNoNutrition, foodNoAllergensList, foodNullNutrition]
  };
  menuEmpty = { restaurantName: 'Empty Spot', items: [] };
  menuWithNullItem = { restaurantName: 'Risky Cafe', items: [foodSafeLowCalHighProt, null as any, foodLowCalLowProt] };
});


// --- Test Suites ---

describe('FoodAssistantChatBot Full Tests', () => {

  //-----------------------------------------------------
  describe('hasAllergen Functionality', () => {
  //-----------------------------------------------------
    // Tests remain the same
    it('Valid: True - Food contains user allergen', () => { expect(hasAllergen(foodAllergenNutsMidCalMidProt, userValid)).toBe(true); });
    it('Valid: False - Food has different allergens', () => { expect(hasAllergen(foodAllergenDairyGlutenHighCal, userValid)).toBe(false); });
    it('Valid: False - User has no allergens', () => { expect(hasAllergen(foodAllergenDairyGlutenHighCal, userNoAllergensPrefs)).toBe(false); });
    it('Valid: False - Food has no allergens specified', () => { expect(hasAllergen(foodNoAllergensList, userValid)).toBe(false); });
    it('Invalid: False - Null/Undefined User', () => { expect(hasAllergen(foodAllergenNutsMidCalMidProt, null)).toBe(false); expect(hasAllergen(foodAllergenNutsMidCalMidProt, undefined)).toBe(false); });
    it('Invalid: False - Null/Undefined Food', () => { expect(hasAllergen(null, userValid)).toBe(false); expect(hasAllergen(undefined, userValid)).toBe(false); });
    it('Invalid: False - Null parameters in User profile', () => { expect(hasAllergen(foodAllergenNutsMidCalMidProt, userNullParams)).toBe(false); });
    it('Boundary: False - User has empty allergen list', () => { expect(hasAllergen(foodAllergenDairyGlutenHighCal, userEmptyAllergens)).toBe(false); });
    it('Boundary: False - Food has empty allergen list', () => { const foodEmptyAllergens = { name: 'Empty Allergens', allergens: [], nutritionInfo: { calories: 100 } }; expect(hasAllergen(foodEmptyAllergens, userValid)).toBe(false); });
    it('Edge: True - User with many allergens, food matches one', () => { const foodWithFish = { name: 'Fish Dish', allergens: ['fish'], nutritionInfo: { calories: 400 }}; expect(hasAllergen(foodWithFish, userAllPossibleAllergens)).toBe(true); });
    it('Edge: False - User with many allergens, food matches none', () => { expect(hasAllergen(foodSafeLowCalHighProt, userAllPossibleAllergens)).toBe(false); });
  });

  //-----------------------------------------------------
  describe('meetsFoodCriteria Functionality', () => {
  //-----------------------------------------------------
    // Tests remain the same up to the corrected block
    it('Valid: True - Meets max calorie limit', () => { expect(meetsFoodCriteria(foodSafeLowCalHighProt, userValid)).toBe(true); });
    it('Valid: False - Exceeds max calorie limit', () => { expect(meetsFoodCriteria(foodHighCalHighProt, userValid)).toBe(false); });
    it('Valid: True - Meets min protein limit', () => { expect(meetsFoodCriteria(foodSafeLowCalHighProt, userValid)).toBe(true); });
    it('Valid: False - Below min protein limit', () => { expect(meetsFoodCriteria(foodLowCalLowProt, userValid)).toBe(false); });
    it('Valid: True - Meets multiple criteria (max cal & min prot)', () => { expect(meetsFoodCriteria(foodSafeLowCalHighProt, userPrefsMaxCalMinProt)).toBe(true); });
    it('Valid: False - Fails one of multiple criteria (max cal)', () => { const highCalOkProt = { name: "High Cal OK Prot", allergens: [], nutritionInfo: { calories: 600, protein_g: 25 }}; expect(meetsFoodCriteria(highCalOkProt, userPrefsMaxCalMinProt)).toBe(false); expect(meetsFoodCriteria(foodAllergenNutsMidCalMidProt, userPrefsMaxCalMinProt)).toBe(false); }); // Fails protein
    it('Valid: True - User has no preferences', () => { expect(meetsFoodCriteria(foodHighCalHighProt, userNoPrefsAllergens)).toBe(true); });

    // **** CORRECTED TEST BLOCK ****
    it('Valid: True - Food has no nutrition info AND user has NO nutrient criteria', () => {
        // User with preferences, but none related to nutrients (e.g., cuisine preference)
        const userNoNutrientPrefs = { userID: 'noNutPrefs', preferences: { preferred_cuisine: 'Italian' }, allergens: [] };
        expect(meetsFoodCriteria(foodNoNutrition, userNoNutrientPrefs)).toBe(true); // Should pass

        // Also test user with explicitly empty preferences object
        const userEmptyPrefs = { userID: 'emptyPrefs', preferences: {}, allergens: [] };
        expect(meetsFoodCriteria(foodNoNutrition, userEmptyPrefs)).toBe(true); // Should pass
    });

    it('Valid: False - Food has no nutrition info BUT user requires nutrients', () => {
         // userValid requires max_cal and min_prot
         expect(meetsFoodCriteria(foodNoNutrition, userValid)).toBe(false);
         // userPrefsStrict requires max_cal and min_prot
         expect(meetsFoodCriteria(foodNoNutrition, userPrefsStrict)).toBe(false);
    });
     it('Valid: False - Food has null nutrition object BUT user requires nutrients', () => {
       expect(meetsFoodCriteria(foodNullNutrition, userPrefsStrict)).toBe(false); // Min protein required
    });
     // **** END CORRECTED BLOCK ****

     it('Invalid: True/Handles - Null/Undefined User', () => { expect(meetsFoodCriteria(foodSafeLowCalHighProt, null)).toBe(true); expect(meetsFoodCriteria(foodSafeLowCalHighProt, undefined)).toBe(true); });
     it('Invalid: True/Handles - Null/Undefined Food', () => { expect(meetsFoodCriteria(null, userValid)).toBe(true); expect(meetsFoodCriteria(undefined, userValid)).toBe(true); });
     it('Invalid: True/Handles - Null preference object', () => { expect(meetsFoodCriteria(foodSafeLowCalHighProt, userNullParams)).toBe(true); });
     it('Boundary: True - Exactly meets max calorie limit', () => { const userAtLimit = { userID: 'limitCal', preferences: { max_calories: 350 }}; expect(meetsFoodCriteria(foodSafeLowCalHighProt, userAtLimit)).toBe(true); });
     it('Boundary: True - Exactly meets min protein limit', () => { const userAtLimit = { userID: 'limitProt', preferences: { min_protein: 30 }}; expect(meetsFoodCriteria(foodSafeLowCalHighProt, userAtLimit)).toBe(true); });
     it('Boundary: True - Meets multiple criteria exactly at limits', () => { const foodAtLimits = { name: "Limits", allergens:[], nutritionInfo: { calories: 500, protein_g: 20 }}; expect(meetsFoodCriteria(foodAtLimits, userPrefsMaxCalMinProt)).toBe(true); });
     it('Edge: False - Food has only cal, fails required min protein', () => { const foodOnlyCal = { name: "Only Cal", allergens: [], nutritionInfo: { calories: 400 }}; expect(meetsFoodCriteria(foodOnlyCal, userPrefsMaxCalMinProt)).toBe(false); });
     it('Edge: True - Food has only prot, meets required min protein, passes calorie implicitly', () => { const foodOnlyProt = { name: "Only Prot", allergens: [], nutritionInfo: { protein_g: 25 }}; expect(meetsFoodCriteria(foodOnlyProt, userPrefsMaxCalMinProt)).toBe(true); });
  });

   //-----------------------------------------------------
   describe('generateSuggestion (Integration Simulation)', () => {
   //-----------------------------------------------------
    // Tests remain the same as previous corrected version
    it('Valid: Suggests items meeting criteria, avoiding allergens', () => {
        const suggestions = generateSuggestion(userValid, menuValid);
        expect(suggestions).toContainEqual(foodSafeLowCalHighProt);
        expect(suggestions).toContainEqual(foodAllergenDairyGlutenHighCal);
        expect(suggestions).not.toContainEqual(foodAllergenNutsMidCalMidProt);
        expect(suggestions).not.toContainEqual(foodHighCalHighProt);
        expect(suggestions).not.toContainEqual(foodLowCalLowProt);
        expect(suggestions).toContainEqual(foodMeetsStrictPrefs);
        expect(suggestions).not.toContainEqual(foodNoNutrition);
        expect(suggestions).not.toContainEqual(foodNoAllergensList);
        expect(suggestions).not.toContainEqual(foodNullNutrition);
        expect(suggestions.length).toBe(3);
      });

      it('Valid: Suggests based on stricter criteria', () => {
          const suggestions = generateSuggestion(userPrefsStrict, menuValid);
          expect(suggestions).toContainEqual(foodMeetsStrictPrefs);
          expect(suggestions.length).toBe(1);
          expect(suggestions).not.toContainEqual(foodNoNutrition);
          expect(suggestions).not.toContainEqual(foodNoAllergensList);
          expect(suggestions).not.toContainEqual(foodNullNutrition);
      });

      it('Invalid: Returns empty for missing userID', () => { expect(generateSuggestion(userInvalidId, menuValid)).toEqual([]); expect(generateSuggestion(userNoId, menuValid)).toEqual([]); });
      it('Invalid: Returns empty for null/undefined user or menu', () => { expect(generateSuggestion(null, menuValid)).toEqual([]); expect(generateSuggestion(userValid, null)).toEqual([]); expect(generateSuggestion(undefined, menuValid)).toEqual([]); expect(generateSuggestion(userValid, undefined)).toEqual([]); });
      it('Invalid: Returns empty for null parameters in profile', () => { expect(generateSuggestion(userNullParams, menuValid)).toEqual([]); });
      it('Boundary: User preferences at max/min limits are handled', () => { const menuEmptyAllergens = { restaurantName: "No Allergens Cafe", items: [ { name: "Safe 1", allergens: [], nutritionInfo: { calories: 100 } }, { name: "Safe 2", allergens: [], nutritionInfo: { calories: 200 } } ] }; const suggestions = generateSuggestion(userEmptyAllergens, menuEmptyAllergens); expect(suggestions.length).toBe(2); const userAtLimit = { userID: 'limitUser', preferences: { max_calories: 200 }, allergens: [] }; const suggestionsLimit = generateSuggestion(userAtLimit, menuEmptyAllergens); expect(suggestionsLimit.length).toBe(2); const userBelowLimit = { userID: 'belowUser', preferences: { max_calories: 150 }, allergens: [] }; const suggestionsBelow = generateSuggestion(userBelowLimit, menuEmptyAllergens); expect(suggestionsBelow.length).toBe(1); });
      it('Edge: Returns only allergen-free items for User with all possible allergens', () => { const suggestions = generateSuggestion(userAllPossibleAllergens, menuValid); expect(suggestions).toContainEqual(foodSafeLowCalHighProt); expect(suggestions).toContainEqual(foodLowCalLowProt); expect(suggestions).toContainEqual(foodMeetsStrictPrefs); expect(suggestions).toContainEqual(foodNoNutrition); expect(suggestions).toContainEqual(foodNoAllergensList); expect(suggestions).toContainEqual(foodNullNutrition); expect(suggestions).not.toContainEqual(foodAllergenDairyGlutenHighCal); expect(suggestions).not.toContainEqual(foodAllergenNutsMidCalMidProt); expect(suggestions).not.toContainEqual(foodHighCalHighProt); expect(suggestions.length).toBe(6); });
      it('Edge: Returns empty for restaurant with no menu items', () => { expect(generateSuggestion(userValid, menuEmpty)).toEqual([]); expect(generateSuggestion(userValid, menuNoItems)).toEqual([]); });
      it('Edge: Handles menu with null items gracefully', () => { const suggestions = generateSuggestion(userValid, menuWithNullItem); expect(suggestions).toContainEqual(foodSafeLowCalHighProt); expect(suggestions).not.toContainEqual(foodLowCalLowProt); expect(suggestions.length).toBe(1); });
  });
});