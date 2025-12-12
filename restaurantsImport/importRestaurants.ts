/**
 * Restaurant CSV Import Script for Firebase
 * 
 * Imports campus restaurants from CCAF CSV file into Firestore 'restaurants_sample' collection
 * All restaurants are prefixed with 'couch_' and categorized by their station/location
 * 
 * CSV Format Expected:
 * - Restaurant names as section headers (e.g., "Sizzle", "Casa Del Sol")
 * - Menu items listed under each restaurant
 * - Ingredients and allergen info provided for calorie estimation
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Types matching restaurants_sample format
interface MenuItemNutrition {
  calories: number;
  protein?: number;
  totalCarbs?: number;
  totalFat?: number;
  sodium?: number;
  sugars?: number;
  fiber?: number;
  saturatedFat?: number;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Beverage' | 'Dessert';
  nutritionInfo: MenuItemNutrition;
  allergens: string[];
  servingSize: string;
  price?: number;
  available: boolean;
  category?: string;
}

interface Restaurant {
  id: string;
  name: string;
  location: string;
  description?: string;
  hours: {
    [key: string]: { open: string; close: string };
  };
  mealTypes: string[];
  menu: MenuItem[];
  lastUpdated: any;
}

// CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes('--dryRun') || args.includes('--dryrun') || args.includes('--dry-run');

function normalizeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function buildItemId(restaurantId: string, category: string | undefined, itemName: string) {
  const parts = [restaurantId, category || 'uncategorized', itemName];
  return normalizeId(parts.join('-'));
}

/**
 * Estimate calories based on meal type and description
 * Uses heuristics since exact nutritional data isn't available in CSV
 */
function estimateCalories(mealName: string, servingSize: string, mealType: string): MenuItemNutrition {
  const lowerName = mealName.toLowerCase();
  let calories = 250; // base estimate

  // Protein-based estimation
  if (lowerName.includes('chicken') || lowerName.includes('beef') || lowerName.includes('steak')) {
    calories = lowerName.includes('fried') ? 450 : 380;
  } else if (lowerName.includes('taco') || lowerName.includes('enchilada')) {
    calories = 380;
  } else if (lowerName.includes('tamale')) {
    calories = 320;
  } else if (lowerName.includes('beans')) {
    calories = 180;
  } else if (lowerName.includes('rice')) {
    calories = 200;
  } else if (lowerName.includes('salsa') || lowerName.includes('pico')) {
    calories = 45;
  } else if (lowerName.includes('guacamole')) {
    calories = 185;
  } else if (lowerName.includes('queso') || lowerName.includes('cheese')) {
    calories = 280;
  } else if (lowerName.includes('dessert') || lowerName.includes('cake') || lowerName.includes('pie')) {
    calories = 380;
  } else if (lowerName.includes('beverage') || lowerName.includes('drink')) {
    calories = 150;
  } else if (lowerName.includes('salad')) {
    calories = 220;
  }

  // Adjust for fried items
  if (lowerName.includes('fried')) {
    calories += 100;
  }

  // Estimate macros from calories (simple ratios)
  const protein = Math.round(calories * 0.25 / 4); // 25% of cals from protein (4 cal/g)
  const totalFat = Math.round(calories * 0.35 / 9); // 35% of cals from fat (9 cal/g)
  const totalCarbs = Math.round(calories * 0.4 / 4); // 40% of cals from carbs (4 cal/g)

  return {
    calories,
    protein,
    totalCarbs,
    totalFat,
    sodium: Math.round(calories * 1.5), // rough estimate: ~1.5mg per calorie
    sugars: Math.round(totalCarbs * 0.15), // ~15% of carbs are sugars
  };
}

/**
 * Extract allergen information from ingredient list
 */
function extractAllergens(ingredientText: string): string[] {
  const allergens: Set<string> = new Set();
  const lowerText = ingredientText.toLowerCase();

  // Common allergens
  if (lowerText.includes('milk') || lowerText.includes('cheese') || lowerText.includes('dairy')) allergens.add('Milk');
  if (lowerText.includes('egg')) allergens.add('Eggs');
  if (lowerText.includes('peanut')) allergens.add('Peanuts');
  if (lowerText.includes('tree nut') || lowerText.includes('almond') || lowerText.includes('cashew')) allergens.add('Tree Nuts');
  if (lowerText.includes('soy') || lowerText.includes('soybean')) allergens.add('Soy');
  if (lowerText.includes('wheat') || lowerText.includes('flour')) allergens.add('Wheat');
  if (lowerText.includes('fish')) allergens.add('Fish');
  if (lowerText.includes('shellfish') || lowerText.includes('shrimp')) allergens.add('Shellfish');
  if (lowerText.includes('sesame')) allergens.add('Sesame');

  return Array.from(allergens);
}

/**
 * Parse CSV and extract restaurant data
 */
function parseCSV(filePath: string): Map<string, MenuItem[]> {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');

  // Top-level restaurants and subcategories in Couch CSV
  const topLevelSections = [
    'Sizzle',
    'Casa Del Sol',
    'ShangHai Stir-fry',
    'Sooner Smokehouse',
    'Build your own Burger Options',
  ];
  const topLevelSet = new Set(topLevelSections.map(s => s.toLowerCase()));
  const subSections = ['Tortillas', 'Beans & Rice', 'Meats and Entrees', 'Sides', 'Toppings'];

  const skipHeaders = [/^cycle\s+/i, /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i];

  const restaurants = new Map<string, MenuItem[]>();
  let currentRestaurant = '';
  let currentCategory = '';
  let itemIndex = 0;

  // Helper to normalize a CSV line: strip wrapping quotes and extra commas
  const normalize = (s: string) => s.replace(/^"|"$/g, '').trim();

  for (const rawLine of lines) {
    const line = normalize(rawLine);
    const trimmed = line.trim();

    // Skip empty or obvious metadata lines
    if (!trimmed) continue;
    if (/^Allergen|^Salt located|^Desserts available|^Vegalene/i.test(trimmed)) continue;

    // Detect explicit restaurant headers wrapped in %% ... %%
    if (/^%%/.test(trimmed) && trimmed.includes('%%', 2)) {
      const between = trimmed.replace(/^%%\s*/, '').replace(/\s*%%$/, '').trim();
      if (between) {
        currentRestaurant = between;
        topLevelSet.add(currentRestaurant.toLowerCase());
        if (!restaurants.has(currentRestaurant)) restaurants.set(currentRestaurant, []);
        currentCategory = '';
        continue;
      }
    }

    // Detect top-level restaurant headers (Sizzle, Casa Del Sol)
    const firstToken = trimmed.split(',')[0].trim();
    const nonEmptyAfterFirst = trimmed.split(',').slice(1).filter(t => t.trim()).length;

    const matchedTop = Array.from(topLevelSet).find(sec =>
      trimmed.toLowerCase().startsWith(sec) || firstToken.toLowerCase() === sec
    );

    const looksLikeHeader =
      !matchedTop &&
      !subSections.some(sec => firstToken.toLowerCase() === sec.toLowerCase()) &&
      !skipHeaders.some(rx => rx.test(firstToken)) &&
      firstToken.length > 2 &&
      firstToken.split(' ').length <= 5 &&
      nonEmptyAfterFirst <= 2;

    if (matchedTop || looksLikeHeader) {
      currentRestaurant = matchedTop || firstToken;
      topLevelSet.add(currentRestaurant.toLowerCase());
      if (!restaurants.has(currentRestaurant)) restaurants.set(currentRestaurant, []);
      currentCategory = '';
      continue;
    }

    // Detect sub-section/category under current restaurant
    const matchedSub = subSections.find(sec =>
      trimmed.toLowerCase().startsWith(sec.toLowerCase()) || firstToken.toLowerCase() === sec.toLowerCase()
    );
    if (matchedSub && currentRestaurant) {
      currentCategory = matchedSub;
      continue;
    }

    // Detect category lines like "Beans & Rice:" or "Meats and Entrees" (with or without colon)
    const isCategory = /:$/i.test(trimmed) || subSections.some((sec: string) => trimmed.toLowerCase().includes(sec.toLowerCase()));
    if (isCategory && currentRestaurant) {
      // If the line ends with a colon, use it; otherwise, keep previous category or set from knownSections
      currentCategory = trimmed.replace(/:$/, '');
      continue;
    }

    // Parse menu item lines: heuristics
    // Many item lines begin with a space or the item name followed by commas/parentheses
    if (currentRestaurant) {
      // Extract item name before first comma, and before parenthesis if present
      const beforeComma = trimmed.split(',')[0];
      const itemNameRaw = beforeComma.split('(')[0].trim();

      // Guard against lines that are too short or are non-item text
      if (!itemNameRaw || itemNameRaw.length < 2) continue;

        // Ignore lines that look like pure category repeats
        if (subSections.some(sec => itemNameRaw.toLowerCase() === sec.toLowerCase()) ||
          topLevelSections.some(sec => itemNameRaw.toLowerCase() === sec.toLowerCase())) continue;

      const servingSizeMatch = trimmed.match(/\(([^)]+)\)/);
      const servingSize = servingSizeMatch ? servingSizeMatch[1] : '1 serving';

      const nutrition = estimateCalories(itemNameRaw, servingSize, currentCategory);
      const allergens = extractAllergens(trimmed);

      const menuItem: MenuItem = {
        id: buildItemId(
          `couch_${currentRestaurant.toLowerCase().replace(/\s+/g, '_')}`,
          currentCategory || 'Entrees',
          itemNameRaw
        ),
        name: itemNameRaw,
        mealType: 'Lunch',
        nutritionInfo: nutrition,
        allergens,
        servingSize,
        available: true,
        category: currentCategory || 'Entrees',
      };

      restaurants.get(currentRestaurant)!.push(menuItem);
    }
  }

  return restaurants;
}

/**
 * Upload restaurants to Firestore
 */
async function uploadRestaurants(restaurants: Map<string, MenuItem[]>) {
  // Load Firebase credentials
  const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
  
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Error: firebase-credentials.json not found in restaurantsImport folder');
    console.error('   Please download your Firebase service account key from:');
    console.error('   Firebase Console → Project Settings → Service Accounts → Generate new private key');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  
  const app = initializeApp({
    credential: cert(serviceAccount),
  });

  const db = getFirestore(app);
  let uploadedCount = 0;
  let errorCount = 0;

  console.log('🍴 Starting restaurant import...\n');

  for (const [restaurantName, menu] of Array.from(restaurants.entries())) {
    try {
      const restaurantId = `couch_${restaurantName.toLowerCase().replace(/\s+/g, '_')}`;
      
      const restaurant: Restaurant = {
        id: restaurantId,
        name: `Couch - ${restaurantName}`,
        location: 'Couch Restaurants',
        description: `${restaurantName} station at Couch Restaurants, serving fresh meals daily`,
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
        menu,
        lastUpdated: new Date(),
      };

      if (dryRun) {
        console.log(`[dryRun] Would upsert restaurant ${restaurant.id} with ${menu.length} items`);
      } else {
        await db.collection('restaurants_sample').doc(restaurantId).set(restaurant, { merge: true });
      }
      
      console.log(`✅ Uploaded: ${restaurant.name} (${menu.length} items)`);
      uploadedCount++;
    } catch (error) {
      console.error(`❌ Error uploading ${restaurantName}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Successfully uploaded: ${uploadedCount} restaurants`);
  console.log(`   ❌ Errors: ${errorCount}`);

  process.exit(errorCount > 0 ? 1 : 0);
}

/**
 * Main execution
 */
async function main() {
  const csvPath = path.join(__dirname, 'CCAF Cycle 1 Spring  2025.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Error: CSV file not found at', csvPath);
    process.exit(1);
  }

  console.log('📖 Parsing CSV file...');
  const restaurants = parseCSV(csvPath);
  console.log(`✅ Found ${restaurants.size} restaurants\n`);

  await uploadRestaurants(restaurants);
}

main().catch(console.error);
