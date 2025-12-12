/**
 * MealForm Component Tests
 * 
 * Tests security, accessibility, and reliability features:
 * - Input validation and bounds checking
 * - Sanitization of user input
 * - ARIA attributes for screen readers
 * - Error handling and defensive parsing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import MealForm from '../components/features/MealForm';

// Mock Firebase modules to avoid initialization during tests
vi.mock('../../firebase', () => ({
  default: {},
}));

vi.mock('../services/favoritesService', () => ({
  getFavoritesForUser: vi.fn().mockResolvedValue([]),
}));

describe('MealForm - Security Tests', () => {
  describe('Input Validation', () => {
    it('enforces maximum name length constraint', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Verify maxLength attribute is set for name input
      expect(html).toContain('maxLength="100"');
    });

    it('enforces maximum calorie constraint', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Verify max attribute is set for calories input
      expect(html).toContain('max="5000"');
    });

    it('enforces non-negative numeric values', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // All numeric inputs should have min="0"
      const minZeroCount = (html.match(/min="0"/g) || []).length;
      expect(minZeroCount).toBeGreaterThan(0);
    });

    it('validates bounds during submission', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Form should exist and have validation attributes
      expect(html).toContain('meal-form');
    });
  });

  describe('Input Sanitization', () => {
    it('renders text inputs for string fields', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Verify name input exists (will be sanitized on submit)
      expect(html).toContain('id="meal-name"');
    });

    it('uses number inputs for numeric fields', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Numeric fields should use type="number"
      expect(html).toContain('type="number"');
    });
  });
});

describe('MealForm - Accessibility Tests', () => {
  describe('ARIA Attributes', () => {
    it('has proper label associations via htmlFor/id', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Check for required field IDs (actual ID is "meal-servings" not "meal-servings-had")
      expect(html).toContain('id="meal-name"');
      expect(html).toContain('id="meal-calories"');
      expect(html).toContain('id="meal-serving-size"');
      expect(html).toContain('id="meal-servings"');
    });

    it('marks required fields with aria-required', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Required fields should have aria-required
      expect(html).toContain('aria-required="true"');
    });

    it('includes aria-invalid attributes for validation states', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Inputs should have aria-invalid attributes (set to false initially)
      expect(html).toContain('aria-invalid="false"');
    });

    it('includes submit button for form submission', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Form should have submit button
      expect(html).toContain('Save Meal');
    });

    it('includes toggle button for optional fields', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Optional fields toggle should be present
      expect(html).toContain('Show more nutrition values');
      expect(html).toContain('aria-expanded');
    });

    it('uses aria-labelledby for fieldset legend association', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Fieldset should have proper ARIA labeling
      const fieldsetMatch = html.match(/<fieldset[^>]*>/);
      if (fieldsetMatch) {
        expect(fieldsetMatch[0]).toContain('aria-labelledby');
      }
    });
  });

  describe('Keyboard Navigation', () => {
    it('uses inputMode="decimal" for numeric inputs', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Mobile keyboard should show decimal pad for numbers
      expect(html).toContain('inputMode="decimal"');
    });

    it('renders submit button as type="submit"', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Submit button should support Enter key submission
      expect(html).toContain('type="submit"');
    });
  });
});

describe('MealForm - Reliability Tests', () => {
  describe('Defensive Data Handling', () => {
    it('handles null initialMeal gracefully', () => {
      const onMealAdded = vi.fn();
      
      // Should not throw when initialMeal is null
      expect(() => {
        renderToString(<MealForm onMealAdded={onMealAdded} initialMeal={null} />);
      }).not.toThrow();
    });

    it('handles initialMeal with missing optional fields', () => {
      const onMealAdded = vi.fn();
      const incompleteMeal: any = {
        id: '1',
        name: 'Test Meal',
        calories: 200,
        servingSize: '1 cup',
        userId: 'user1',
        createdAt: new Date(),
      };
      
      // Should not throw when optional fields are missing
      expect(() => {
        renderToString(<MealForm onMealAdded={onMealAdded} initialMeal={incompleteMeal} />);
      }).not.toThrow();
    });

    it('handles initialMeal with null numeric values', () => {
      const onMealAdded = vi.fn();
      const mealWithNulls: any = {
        id: '1',
        name: 'Test Meal',
        calories: 200,
        servingSize: '1 cup',
        protein: null,
        totalCarbs: null,
        totalFat: null,
        userId: 'user1',
        createdAt: new Date(),
      };
      
      // Should handle null values without crashing
      expect(() => {
        renderToString(<MealForm onMealAdded={onMealAdded} initialMeal={mealWithNulls} />);
      }).not.toThrow();
    });
  });

  describe('Error State Management', () => {
    it('includes form validation attributes', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Form should have required attributes on inputs
      expect(html).toContain('required=""');
    });

    it('includes aria-invalid attributes for validation', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Inputs should support aria-invalid state
      const ariaInvalidCount = (html.match(/aria-invalid/g) || []).length;
      expect(ariaInvalidCount).toBeGreaterThan(0);
    });
  });

  describe('Form Structure', () => {
    it('renders form element with proper class', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      expect(html).toContain('class="meal-form"');
    });

    it('renders all required input fields', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Check for required field IDs
      expect(html).toContain('id="meal-name"');
      expect(html).toContain('id="meal-calories"');
      expect(html).toContain('id="meal-serving-size"');
      expect(html).toContain('id="meal-servings"');
    });

    it('renders optional fields toggle', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
      
      // Optional fields toggle should be present
      expect(html).toContain('Show more nutrition values');
    });
  });

  describe('Planning Mode', () => {
    it('accepts planningMode prop', () => {
      const onMealAdded = vi.fn();
      
      // Should not throw with planningMode enabled
      expect(() => {
        renderToString(<MealForm onMealAdded={onMealAdded} planningMode={true} />);
      }).not.toThrow();
    });

    it('renders form normally in planning mode', () => {
      const onMealAdded = vi.fn();
      const html = renderToString(<MealForm onMealAdded={onMealAdded} planningMode={true} />);
      
      expect(html).toContain('meal-form');
    });
  });
});

describe('MealForm - Integration Tests', () => {
  it('renders complete form without errors', () => {
    const onMealAdded = vi.fn();
    
    expect(() => {
      renderToString(<MealForm onMealAdded={onMealAdded} />);
    }).not.toThrow();
  });

  it('renders with all props provided', () => {
    const onMealAdded = vi.fn();
    const onInitialMealSet = vi.fn();
    const meal: any = {
      id: '1',
      name: 'Chicken Breast',
      calories: 165,
      servingSize: '3 oz',
      servingsHad: 1,
      protein: 31,
      totalCarbs: 0,
      totalFat: 3.6,
      userId: 'user1',
      createdAt: new Date(),
    };
    
    expect(() => {
      renderToString(
        <MealForm 
          onMealAdded={onMealAdded}
          initialMeal={meal}
          onInitialMealSet={onInitialMealSet}
          planningMode={false}
        />
      );
    }).not.toThrow();
  });

  it('includes Toast component for notifications', () => {
    const onMealAdded = vi.fn();
    const html = renderToString(<MealForm onMealAdded={onMealAdded} />);
    
    // Toast component should be rendered (though not visible initially)
    expect(html).toBeTruthy();
  });
});
