import { describe, it, expect } from 'vitest';

// --- Minimal Stubs (Keep these or import functions) ---
// --- Type Definitions ---
type MenuItem = { name: string; price: number; };
type Restaurant = { id: string; name: string; menu?: MenuItem[] };

// --- Function Under Test ---
function getRestaurantMenu(restaurant: Restaurant | null | undefined): MenuItem[] {
  if (!restaurant?.menu || restaurant.menu.length === 0) return [];
  return restaurant.menu;
}

// --- Unit Tests ---
describe('getRestaurantMenu Tests', () => {

  it('returns full menu when restaurant has menu items', () => {
    const restaurant: Restaurant = {
      id: '1',
      name: 'Test Restaurant',
      menu: [
        { name: 'Pizza', price: 12.99 },
        { name: 'Burger', price: 8.99 }
      ]
    };
    
    const result = getRestaurantMenu(restaurant);
    expect(result).toEqual(restaurant.menu);
  });

  it('returns empty array when restaurant is null', () => {
    const result = getRestaurantMenu(null);
    expect(result).toEqual([]);
  });

  it('returns empty array when restaurant is undefined', () => {
    const result = getRestaurantMenu(undefined);
    expect(result).toEqual([]);
  });

  it('returns empty array when menu is undefined', () => {
    const restaurant: Restaurant = {
      id: '1',
      name: 'Test Restaurant'
      // menu is undefined
    };
    
    const result = getRestaurantMenu(restaurant);
    expect(result).toEqual([]);
  });

  it('returns empty array when menu is empty', () => {
    const restaurant: Restaurant = {
      id: '1',
      name: 'Test Restaurant',
      menu: []
    };
    
    const result = getRestaurantMenu(restaurant);
    expect(result).toEqual([]);
  });
});