# Restaurant Import Guide

This folder contains scripts to import campus restaurant data from the CCAF CSV file into Firebase.

## Files

- **`importRestaurants.ts`** - Main import script that parses CSV and uploads to Firestore
- **`CCAF Cycle 1 Spring 2025.csv`** - Source data file with menu items and ingredients
- **`Makefile`** - Automation for installation and import
- **`package.json`** - Node.js dependencies

## Setup

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `on-campus-nutrition-tracker`
3. Click ⚙️ **Project Settings** (top-left)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file as `firebase-credentials.json` in this folder

### 2. Install Dependencies

```bash
make install
```

Or manually:
```bash
npm install
```

### 3. Run Import

```bash
make import
```

This will:
- Parse the CCAF CSV file
- Extract restaurant names (all prefixed with `couch_`)
- Estimate calories for each menu item based on ingredient analysis
- Extract allergens from ingredient descriptions
- Upload to Firestore `restaurants_sample` collection

## Script Details

### How It Works

1. **CSV Parsing**: Reads the CSV and extracts restaurant sections (Sizzle, Casa Del Sol, etc.)
2. **Restaurant Naming**: All restaurants are named as `couch_<name>` (e.g., `couch_sizzle`)
3. **Menu Items**: Each menu item includes:
   - Name and description
   - Estimated calories (based on ingredient analysis)
   - Macro nutrients (protein, carbs, fat)
   - Allergen information
   - Serving size
4. **Firestore Structure**: 
   ```
   /restaurants_sample/{restaurantId}
   ├── id: "couch_sizzle"
   ├── name: "Couch - Sizzle"
   ├── location: "Couch Restaurants"
   ├── menu: [MenuItem[], ...]
   ├── hours: {...}
   └── lastUpdated: timestamp
   ```

### Calorie Estimation

Since exact nutrition data isn't in the CSV, the script estimates calories based on:
- Meal type (chicken, beef, beans, etc.)
- Preparation method (fried vs. grilled)
- Common serving sizes
- Heuristic macro calculations (25% protein, 35% fat, 40% carbs)

### Allergen Detection

Extracts allergens from ingredient text:
- Milk/Cheese/Dairy
- Eggs
- Peanuts
- Tree Nuts
- Soy/Soybean
- Wheat/Flour
- Fish
- Shellfish
- Sesame

## Makefile Targets

```bash
make help       # Show help
make install    # Install npm dependencies
make import     # Run ts-node import script
make build      # Compile TypeScript to JavaScript
make run        # Run compiled JavaScript
make clean      # Remove node_modules and compiled files
```

## Troubleshooting

### "firebase-credentials.json not found"
- Download your Firebase service account key and save it in this folder

### "Module not found: firebase-admin"
- Run `make install` or `npm install`

### CSV parsing issues
- Ensure CSV file is in the correct location: `CCAF Cycle 1 Spring 2025.csv`
- Check file encoding is UTF-8

### Firebase upload fails
- Verify Firestore rules allow writes (check `firestore.rules`)
- Ensure your service account has Firestore write permissions
- Check Firebase Console for any denied operations

## Firebase Rules

Ensure your `firestore.rules` allows public read for `restaurants_sample`:

```javascript
match /restaurants_sample/{restaurantId} {
  allow read: if true;  // Public read
  allow write: if false; // No public writes
}
```

## Next Steps

After import, verify data in Firebase Console:
1. Go to **Firestore Database**
2. Check `restaurants_sample` collection
3. Expand documents to see menu items
4. Test the app - restaurants should now load in the UI
