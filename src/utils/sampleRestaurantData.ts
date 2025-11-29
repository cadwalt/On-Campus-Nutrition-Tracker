/**
 * Sample Restaurant Data for OU Campus Restaurants Tab
 * 
 * This file contains sample data for testing the OU Restaurants feature.
 * Data is stored in a separate Firestore collection ('restaurants_sample')
 * to keep it separate from real production data.
 */

import type { Timestamp } from 'firebase/firestore';

export interface MenuItemNutrition {
  calories: number;
  protein?: number; // grams
  totalCarbs?: number; // grams
  totalFat?: number; // grams
  sodium?: number; // mg
  sugars?: number; // grams
  fiber?: number; // grams
  saturatedFat?: number; // grams
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Beverage' | 'Dessert';
  nutritionInfo: MenuItemNutrition;
  allergens: string[];
  servingSize: string;
  price?: number;
  available: boolean;
  category?: string; // e.g., "Entrees", "Sides", "Salads"
}

export interface Restaurant {
  id: string;
  name: string;
  location: string; // e.g., "Couch Restaurants", "Crossroads", "Cate Center"
  description?: string;
  hours: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  mealTypes: string[]; // e.g., ["Breakfast", "Lunch", "Dinner"]
  menu: MenuItem[];
  lastUpdated: Timestamp | Date | number;
}

/**
 * Sample OU Campus Restaurants Data
 */
export const sampleRestaurants: Restaurant[] = [
  {
    id: 'couch_main',
    name: 'Couch Restaurants - Main Dining',
    location: 'Couch Restaurants',
    description: 'Main dining hall featuring a variety of stations',
    hours: {
      monday: { open: '07:00', close: '20:00' },
      tuesday: { open: '07:00', close: '20:00' },
      wednesday: { open: '07:00', close: '20:00' },
      thursday: { open: '07:00', close: '20:00' },
      friday: { open: '07:00', close: '19:00' },
      saturday: { open: '10:00', close: '19:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    menu: [
      {
        id: 'scrambled_eggs',
        name: 'Scrambled Eggs',
        description: 'Fresh scrambled eggs',
        mealType: 'Breakfast',
        nutritionInfo: {
          calories: 180,
          protein: 12,
          totalCarbs: 2,
          totalFat: 14,
          sodium: 170,
        },
        allergens: ['Eggs'],
        servingSize: '1 serving (2 eggs)',
        available: true,
        category: 'Breakfast Entrees',
      },
      {
        id: 'pancakes',
        name: 'Buttermilk Pancakes',
        description: 'Fluffy buttermilk pancakes with syrup',
        mealType: 'Breakfast',
        nutritionInfo: {
          calories: 350,
          protein: 8,
          totalCarbs: 55,
          totalFat: 10,
          sodium: 600,
          sugars: 12,
        },
        allergens: ['Wheat', 'Eggs', 'Milk'],
        servingSize: '2 pancakes',
        available: true,
        category: 'Breakfast Entrees',
      },
      {
        id: 'oatmeal',
        name: 'Steel Cut Oatmeal',
        description: 'Hot oatmeal with optional toppings',
        mealType: 'Breakfast',
        nutritionInfo: {
          calories: 160,
          protein: 6,
          totalCarbs: 27,
          totalFat: 3,
          fiber: 4,
          sodium: 5,
        },
        allergens: [],
        servingSize: '1 bowl',
        available: true,
        category: 'Breakfast Entrees',
      },
      {
        id: 'grilled_chicken',
        name: 'Grilled Chicken Breast',
        description: 'Seasoned grilled chicken breast',
        mealType: 'Lunch',
        nutritionInfo: {
          calories: 250,
          protein: 28,
          totalCarbs: 0,
          totalFat: 12,
          sodium: 450,
        },
        allergens: [],
        servingSize: '1 piece (6 oz)',
        available: true,
        category: 'Entrees',
      },
      {
        id: 'pasta_marinara',
        name: 'Pasta with Marinara Sauce',
        description: 'Penne pasta with classic marinara sauce',
        mealType: 'Lunch',
        nutritionInfo: {
          calories: 320,
          protein: 12,
          totalCarbs: 58,
          totalFat: 6,
          sodium: 480,
          fiber: 3,
        },
        allergens: ['Wheat'],
        servingSize: '1 serving',
        available: true,
        category: 'Entrees',
      },
      {
        id: 'garden_salad',
        name: 'Garden Salad',
        description: 'Mixed greens with vegetables',
        mealType: 'Lunch',
        nutritionInfo: {
          calories: 50,
          protein: 2,
          totalCarbs: 8,
          totalFat: 0,
          sodium: 20,
          fiber: 3,
        },
        allergens: [],
        servingSize: '1 bowl',
        available: true,
        category: 'Salads',
      },
      {
        id: 'burger',
        name: 'Classic Burger',
        description: 'Beef patty with bun, lettuce, tomato',
        mealType: 'Dinner',
        nutritionInfo: {
          calories: 550,
          protein: 25,
          totalCarbs: 45,
          totalFat: 28,
          sodium: 850,
          saturatedFat: 12,
        },
        allergens: ['Wheat', 'Eggs', 'Milk'],
        servingSize: '1 burger',
        available: true,
        category: 'Entrees',
      },
      {
        id: 'pizza_slice',
        name: 'Cheese Pizza Slice',
        description: 'Classic cheese pizza',
        mealType: 'Dinner',
        nutritionInfo: {
          calories: 280,
          protein: 12,
          totalCarbs: 36,
          totalFat: 10,
          sodium: 550,
          saturatedFat: 5,
        },
        allergens: ['Wheat', 'Milk'],
        servingSize: '1 slice',
        available: true,
        category: 'Entrees',
      },
    ],
    lastUpdated: Date.now(),
  },
  {
    id: 'crossroads',
    name: 'Crossroads',
    location: 'Crossroads',
    description: 'Quick service dining with multiple stations',
    hours: {
      monday: { open: '07:00', close: '22:00' },
      tuesday: { open: '07:00', close: '22:00' },
      wednesday: { open: '07:00', close: '22:00' },
      thursday: { open: '07:00', close: '22:00' },
      friday: { open: '07:00', close: '21:00' },
      saturday: { open: '10:00', close: '21:00' },
      sunday: { open: '10:00', close: '22:00' },
    },
    mealTypes: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
    menu: [
      {
        id: 'breakfast_burrito',
        name: 'Breakfast Burrito',
        description: 'Scrambled eggs, cheese, and choice of meat in a tortilla',
        mealType: 'Breakfast',
        nutritionInfo: {
          calories: 420,
          protein: 20,
          totalCarbs: 38,
          totalFat: 22,
          sodium: 950,
        },
        allergens: ['Wheat', 'Eggs', 'Milk'],
        servingSize: '1 burrito',
        available: true,
        category: 'Breakfast Entrees',
      },
      {
        id: 'chicken_wrap',
        name: 'Grilled Chicken Wrap',
        description: 'Grilled chicken, lettuce, tomato in a wrap',
        mealType: 'Lunch',
        nutritionInfo: {
          calories: 380,
          protein: 30,
          totalCarbs: 35,
          totalFat: 14,
          sodium: 720,
        },
        allergens: ['Wheat'],
        servingSize: '1 wrap',
        available: true,
        category: 'Entrees',
      },
      {
        id: 'chicken_tenders',
        name: 'Chicken Tenders',
        description: 'Breaded chicken tenders with dipping sauce',
        mealType: 'Lunch',
        nutritionInfo: {
          calories: 320,
          protein: 24,
          totalCarbs: 18,
          totalFat: 16,
          sodium: 680,
        },
        allergens: ['Wheat', 'Eggs'],
        servingSize: '3 pieces',
        available: true,
        category: 'Entrees',
      },
      {
        id: 'fries',
        name: 'French Fries',
        description: 'Crispy golden fries',
        mealType: 'Snack',
        nutritionInfo: {
          calories: 250,
          protein: 3,
          totalCarbs: 30,
          totalFat: 12,
          sodium: 200,
        },
        allergens: [],
        servingSize: '1 serving',
        available: true,
        category: 'Sides',
      },
    ],
    lastUpdated: Date.now(),
  },
  {
    id: 'cate_center',
    name: 'Cate Center',
    location: 'Cate Center',
    description: 'Dining hall with rotating menu options',
    hours: {
      monday: { open: '07:00', close: '20:00' },
      tuesday: { open: '07:00', close: '20:00' },
      wednesday: { open: '07:00', close: '20:00' },
      thursday: { open: '07:00', close: '20:00' },
      friday: { open: '07:00', close: '19:00' },
      saturday: { open: '10:00', close: '19:00' },
      sunday: { open: '10:00', close: '20:00' },
    },
    mealTypes: ['Breakfast', 'Lunch', 'Dinner'],
    menu: [
      {
        id: 'yogurt_parfait',
        name: 'Yogurt Parfait',
        description: 'Greek yogurt with granola and berries',
        mealType: 'Breakfast',
        nutritionInfo: {
          calories: 220,
          protein: 12,
          totalCarbs: 32,
          totalFat: 6,
          sodium: 80,
          sugars: 20,
        },
        allergens: ['Milk'],
        servingSize: '1 parfait',
        available: true,
        category: 'Breakfast Entrees',
      },
      {
        id: 'salmon',
        name: 'Grilled Salmon',
        description: 'Fresh grilled salmon fillet',
        mealType: 'Dinner',
        nutritionInfo: {
          calories: 280,
          protein: 34,
          totalCarbs: 0,
          totalFat: 14,
          sodium: 85,
        },
        allergens: ['Fish'],
        servingSize: '1 fillet (6 oz)',
        available: true,
        category: 'Entrees',
      },
      {
        id: 'stir_fry',
        name: 'Vegetable Stir Fry',
        description: 'Mixed vegetables with rice',
        mealType: 'Dinner',
        nutritionInfo: {
          calories: 240,
          protein: 6,
          totalCarbs: 42,
          totalFat: 6,
          sodium: 520,
          fiber: 4,
        },
        allergens: ['Soy'],
        servingSize: '1 serving',
        available: true,
        category: 'Entrees',
      },
      {
        id: 'ice_cream',
        name: 'Ice Cream',
        description: 'Vanilla ice cream',
        mealType: 'Dessert',
        nutritionInfo: {
          calories: 180,
          protein: 3,
          totalCarbs: 22,
          totalFat: 9,
          sodium: 60,
          sugars: 20,
          saturatedFat: 5,
        },
        allergens: ['Milk'],
        servingSize: '1 scoop',
        available: true,
        category: 'Desserts',
      },
    ],
    lastUpdated: Date.now(),
  },
];

/**
 * Populate Firestore with sample restaurant data
 * 
 * This function adds all sample restaurants to the 'restaurants_sample' collection.
 * Run this once to set up test data.
 * 
 * @param db - Firestore database instance
 * @param firestore - Firestore module
 * @returns Promise that resolves when all data is added
 */
export async function populateSampleRestaurants(
  db: any,
  firestore: any
): Promise<void> {
  try {
    console.log('Starting to populate sample restaurant data...');
    
    for (const restaurant of sampleRestaurants) {
      const restaurantRef = firestore.doc(db, 'restaurants_sample', restaurant.id);
      
      // Prepare restaurant data (exclude menu items from top level)
      const restaurantData = {
        name: restaurant.name,
        location: restaurant.location,
        description: restaurant.description || '',
        hours: restaurant.hours,
        mealTypes: restaurant.mealTypes,
        lastUpdated: firestore.Timestamp.now(),
      };
      
      // Set restaurant document
      await firestore.setDoc(restaurantRef, restaurantData);
      console.log(`✓ Added restaurant: ${restaurant.name}`);
      
      // Add menu items as subcollection
      const menuRef = firestore.collection(restaurantRef, 'menu');
      
      for (const item of restaurant.menu) {
        const itemRef = firestore.doc(menuRef, item.id);
        await firestore.setDoc(itemRef, {
          ...item,
          lastUpdated: firestore.Timestamp.now(),
        });
        console.log(`  ✓ Added menu item: ${item.name}`);
      }
    }
    
    console.log('✓ Successfully populated all sample restaurant data!');
  } catch (error) {
    console.error('Error populating sample restaurants:', error);
    throw error;
  }
}

/**
 * Helper function to populate sample data from browser console or admin page
 * Usage: Call this function after importing resolveFirebase
 */
export async function runSampleDataPopulation(): Promise<void> {
  try {
    const mod: any = await import('../firebase');
    const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
    const firestore = await import('firebase/firestore');
    
    await populateSampleRestaurants(db, firestore);
    alert('Sample restaurant data populated successfully!');
  } catch (error) {
    console.error('Failed to populate sample data:', error);
    alert('Failed to populate sample data. Check console for details.');
  }
}

