<<<<<<< HEAD
import { describe, it, expect } from 'vitest';

// --- Types ---
type UserProfile = { userID: string; preferences?: any; allergens?: string[]; };
type FoodItem = { name: string; allergens?: string[]; nutritionInfo?: any; };

// --- Small helpers / stubs used by tests (replace with real imports if available) ---
function hasAllergen(foodItem: FoodItem | null | undefined, user: UserProfile | null | undefined): boolean {
  return Boolean(foodItem?.allergens?.some(a => user?.allergens?.includes(a)));
}

function meetsFoodCriteria(foodItem: FoodItem | null | undefined, user: UserProfile | null | undefined): boolean {
  if (!foodItem?.nutritionInfo?.calories || !user?.preferences?.max_calories) return true;
  return foodItem.nutritionInfo.calories <= user.preferences.max_calories;
}

// Allergen management helpers used by tests
function addAllergenToUser(user: UserProfile, allergen: string): UserProfile {
  const list = user.allergens ?? [];
  if (!list.includes(allergen)) user.allergens = [...list, allergen];
  return user;
}

function removeAllergenFromUser(user: UserProfile, allergen: string): UserProfile {
  const list = user.allergens ?? [];
  user.allergens = list.filter(a => a !== allergen);
  return user;
}

function getUserAllergens(user: UserProfile): string[] {
  return [...(user.allergens ?? [])];
}

// Example feature that pulls allergen info to recommend safe foods
function recommendSafeFoods(user: UserProfile, foods: FoodItem[]): FoodItem[] {
  const userAllergens = user.allergens ?? [];
  return foods.filter(f => !(f.allergens ?? []).some(a => userAllergens.includes(a)));
}

// Mock service that other features might call
const AllergenService = {
  fetchAllergens(user: UserProfile) {
    return getUserAllergens(user);
  }
};

// --- Test Suite ---
describe('Allergen-related tests', () => {

  // Existing coverage (kept) -------------------------------------------------
  it('hasAllergen - positive match', () => {
    const user: UserProfile = { userID: 'u1', allergens: ['nuts'] };
    const food: FoodItem = { name: 'Peanut Dish', allergens: ['nuts', 'dairy'] };
    expect(hasAllergen(food, user)).toBe(true);
  });

  it('hasAllergen - negative match', () => {
    const user: UserProfile = { userID: 'u1', allergens: ['nuts'] };
    const food: FoodItem = { name: 'Cheese Dish', allergens: ['dairy'] };
    expect(hasAllergen(food, user)).toBe(false);
  });

  it('meetsFoodCriteria - various calorie checks', () => {
     const userA: UserProfile = { userID: 'u4', preferences: { max_calories: 500 } };
     const salad: FoodItem = { name: 'Salad', nutritionInfo: { calories: 300 } };
     const burger: FoodItem = { name: 'Burger', nutritionInfo: { calories: 700 } };
     expect(meetsFoodCriteria(salad, userA)).toBe(true);
     expect(meetsFoodCriteria(burger, userA)).toBe(false);
     const userB: UserProfile = { userID: 'u5', preferences: { max_calories: 700 } };
     expect(meetsFoodCriteria(burger, userB)).toBe(true);
  });

  // New allergen management tests --------------------------------------------
  it('addAllergenToUser adds allergen and prevents duplicates', () => {
    const user: UserProfile = { userID: 'u10', allergens: ['dairy'] };
    addAllergenToUser(user, 'nuts');
    expect(user.allergens).toContain('nuts');
    // adding duplicate should not create another entry
    addAllergenToUser(user, 'nuts');
    expect(user.allergens?.filter(a => a === 'nuts').length).toBe(1);
  });

  it('removeAllergenFromUser removes existing allergen and is idempotent', () => {
    const user: UserProfile = { userID: 'u11', allergens: ['soy', 'gluten'] };
    removeAllergenFromUser(user, 'soy');
    expect(user.allergens).not.toContain('soy');
    // removing again should be a no-op
    removeAllergenFromUser(user, 'soy');
    expect(user.allergens).toEqual(['gluten']);
  });

  it('getUserAllergens returns a copy not shared by reference', () => {
    const user: UserProfile = { userID: 'u12', allergens: ['fish'] };
    const list = getUserAllergens(user);
    list.push('shellfish');
    // original should be unchanged
    expect(user.allergens).toEqual(['fish']);
  });

  it('features reflect updated allergen info (recommendSafeFoods)', () => {
    const user: UserProfile = { userID: 'u13', allergens: ['peanuts'] };
    const foods: FoodItem[] = [
      { name: 'PB Sandwich', allergens: ['peanuts'] },
      { name: 'Fruit Salad', allergens: [] },
      { name: 'Trail Mix', allergens: ['nuts', 'seeds'] }
    ];

    const safeBefore = recommendSafeFoods(user, foods).map(f => f.name);
    expect(safeBefore).toEqual(expect.arrayContaining(['Fruit Salad']));
    expect(safeBefore).not.toContain('PB Sandwich');

    // user adds 'nuts' allergen -> Trail Mix becomes unsafe
    addAllergenToUser(user, 'nuts');
    const safeAfter = recommendSafeFoods(user, foods).map(f => f.name);
    expect(safeAfter).not.toContain('Trail Mix');
    expect(safeAfter).toEqual(['Fruit Salad']);
  });

  it('AllergenService.fetchAllergens reads current user allergen list', () => {
    const user: UserProfile = { userID: 'u14', allergens: ['dairy'] };
    expect(AllergenService.fetchAllergens(user)).toEqual(['dairy']);
    addAllergenToUser(user, 'eggs');
    expect(AllergenService.fetchAllergens(user)).toEqual(expect.arrayContaining(['dairy', 'eggs']));
    removeAllergenFromUser(user, 'dairy');
    expect(AllergenService.fetchAllergens(user)).toEqual(['eggs']);
  });

});

=======
import { describe, it, expect } from 'vitest';

// --- Types ---
type UserProfile = { userID: string; preferences?: any; allergens?: string[]; };
type FoodItem = { name: string; allergens?: string[]; nutritionInfo?: any; };

// --- Small helpers / stubs used by tests (replace with real imports if available) ---
function hasAllergen(foodItem: FoodItem | null | undefined, user: UserProfile | null | undefined): boolean {
  return Boolean(foodItem?.allergens?.some(a => user?.allergens?.includes(a)));
}

function meetsFoodCriteria(foodItem: FoodItem | null | undefined, user: UserProfile | null | undefined): boolean {
  if (!foodItem?.nutritionInfo?.calories || !user?.preferences?.max_calories) return true;
  return foodItem.nutritionInfo.calories <= user.preferences.max_calories;
}

// Allergen management helpers used by tests
function addAllergenToUser(user: UserProfile, allergen: string): UserProfile {
  const list = user.allergens ?? [];
  if (!list.includes(allergen)) user.allergens = [...list, allergen];
  return user;
}

function removeAllergenFromUser(user: UserProfile, allergen: string): UserProfile {
  const list = user.allergens ?? [];
  user.allergens = list.filter(a => a !== allergen);
  return user;
}

function getUserAllergens(user: UserProfile): string[] {
  return [...(user.allergens ?? [])];
}

// Example feature that pulls allergen info to recommend safe foods
function recommendSafeFoods(user: UserProfile, foods: FoodItem[]): FoodItem[] {
  const userAllergens = user.allergens ?? [];
  return foods.filter(f => !(f.allergens ?? []).some(a => userAllergens.includes(a)));
}

// Mock service that other features might call
const AllergenService = {
  fetchAllergens(user: UserProfile) {
    return getUserAllergens(user);
  }
};

// --- Test Suite ---
describe('Allergen-related tests', () => {

  // Existing coverage (kept) -------------------------------------------------
  it('hasAllergen - positive match', () => {
    const user: UserProfile = { userID: 'u1', allergens: ['nuts'] };
    const food: FoodItem = { name: 'Peanut Dish', allergens: ['nuts', 'dairy'] };
    expect(hasAllergen(food, user)).toBe(true);
  });

  it('hasAllergen - negative match', () => {
    const user: UserProfile = { userID: 'u1', allergens: ['nuts'] };
    const food: FoodItem = { name: 'Cheese Dish', allergens: ['dairy'] };
    expect(hasAllergen(food, user)).toBe(false);
  });

  it('meetsFoodCriteria - various calorie checks', () => {
     const userA: UserProfile = { userID: 'u4', preferences: { max_calories: 500 } };
     const salad: FoodItem = { name: 'Salad', nutritionInfo: { calories: 300 } };
     const burger: FoodItem = { name: 'Burger', nutritionInfo: { calories: 700 } };
     expect(meetsFoodCriteria(salad, userA)).toBe(true);
     expect(meetsFoodCriteria(burger, userA)).toBe(false);
     const userB: UserProfile = { userID: 'u5', preferences: { max_calories: 700 } };
     expect(meetsFoodCriteria(burger, userB)).toBe(true);
  });

  // New allergen management tests --------------------------------------------
  it('addAllergenToUser adds allergen and prevents duplicates', () => {
    const user: UserProfile = { userID: 'u10', allergens: ['dairy'] };
    addAllergenToUser(user, 'nuts');
    expect(user.allergens).toContain('nuts');
    // adding duplicate should not create another entry
    addAllergenToUser(user, 'nuts');
    expect(user.allergens?.filter(a => a === 'nuts').length).toBe(1);
  });

  it('removeAllergenFromUser removes existing allergen and is idempotent', () => {
    const user: UserProfile = { userID: 'u11', allergens: ['soy', 'gluten'] };
    removeAllergenFromUser(user, 'soy');
    expect(user.allergens).not.toContain('soy');
    // removing again should be a no-op
    removeAllergenFromUser(user, 'soy');
    expect(user.allergens).toEqual(['gluten']);
  });

  it('getUserAllergens returns a copy not shared by reference', () => {
    const user: UserProfile = { userID: 'u12', allergens: ['fish'] };
    const list = getUserAllergens(user);
    list.push('shellfish');
    // original should be unchanged
    expect(user.allergens).toEqual(['fish']);
  });

  it('features reflect updated allergen info (recommendSafeFoods)', () => {
    const user: UserProfile = { userID: 'u13', allergens: ['peanuts'] };
    const foods: FoodItem[] = [
      { name: 'PB Sandwich', allergens: ['peanuts'] },
      { name: 'Fruit Salad', allergens: [] },
      { name: 'Trail Mix', allergens: ['nuts', 'seeds'] }
    ];

    const safeBefore = recommendSafeFoods(user, foods).map(f => f.name);
    expect(safeBefore).toEqual(expect.arrayContaining(['Fruit Salad']));
    expect(safeBefore).not.toContain('PB Sandwich');

    // user adds 'nuts' allergen -> Trail Mix becomes unsafe
    addAllergenToUser(user, 'nuts');
    const safeAfter = recommendSafeFoods(user, foods).map(f => f.name);
    expect(safeAfter).not.toContain('Trail Mix');
    expect(safeAfter).toEqual(['Fruit Salad']);
  });

  it('AllergenService.fetchAllergens reads current user allergen list', () => {
    const user: UserProfile = { userID: 'u14', allergens: ['dairy'] };
    expect(AllergenService.fetchAllergens(user)).toEqual(['dairy']);
    addAllergenToUser(user, 'eggs');
    expect(AllergenService.fetchAllergens(user)).toEqual(expect.arrayContaining(['dairy', 'eggs']));
    removeAllergenFromUser(user, 'dairy');
    expect(AllergenService.fetchAllergens(user)).toEqual(['eggs']);
  });

});

>>>>>>> 3449604f23503c51d893151942e46f034bb45a8d
