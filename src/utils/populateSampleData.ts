/**
 * Utility script to populate sample restaurant data
 * 
 * This can be run from the browser console or as a one-time setup script.
 * 
 * Usage in browser console:
 *   import('./utils/populateSampleData').then(m => m.populateSampleRestaurants());
 */

import { populateSampleRestaurants } from './sampleRestaurantData';

const resolveFirebase = async () => {
  const mod: any = await import('../firebase');
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import('firebase/firestore');
  return { db, firestore };
};

/**
 * Main function to populate sample data
 * Call this from browser console or admin page
 */
export async function populateSampleRestaurantsData(): Promise<void> {
  try {
    const { db, firestore } = await resolveFirebase();
    await populateSampleRestaurants(db, firestore);
    console.log('Sample restaurant data populated successfully!');
    return Promise.resolve();
  } catch (error) {
    console.error('Error populating sample data:', error);
    throw error;
  }
}

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).populateSampleRestaurants = populateSampleRestaurantsData;
}

