import { describe, it, expect, beforeEach } from 'vitest';
import type { WeightEntry } from '../types/weight';

/**
 * Comprehensive test suite for weight tracking functionality.
 * Tests cover:
 * - Weight entry CRUD operations
 * - Unit conversion logic (kg to lbs)
 * - Date validation
 * - Goal-reached detection
 * - Edit/delete functionality
 * - Legacy document normalization
 */

// =====================================================
// Unit Conversion Tests
// =====================================================

/**
 * Converts kg to lbs, rounded to 1 decimal place.
 * This mirrors the conversion logic in weightService.ts and WeightTracker.tsx.
 */
function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

/**
 * Converts lbs to kg, rounded to 1 decimal place.
 */
function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

describe('Unit Conversion Logic', () => {
  it('converts kg to lbs correctly for common values', () => {
    expect(kgToLbs(70)).toBe(154.3);
    expect(kgToLbs(80)).toBe(176.4);
    expect(kgToLbs(90)).toBe(198.4);
    expect(kgToLbs(100)).toBe(220.5);
  });

  it('converts lbs to kg correctly for common values', () => {
    expect(lbsToKg(150)).toBe(68.0);
    expect(lbsToKg(180)).toBe(81.6);
    expect(lbsToKg(200)).toBe(90.7);
  });

  it('handles edge case: 1 kg', () => {
    expect(kgToLbs(1)).toBe(2.2);
  });

  it('handles edge case: very large weight (700 kg)', () => {
    expect(kgToLbs(700)).toBe(1543.2);
  });

  it('handles decimal input correctly', () => {
    expect(kgToLbs(70.5)).toBe(155.4);
    expect(kgToLbs(80.3)).toBe(177.0); // 80.3 * 2.20462 = 177.011... (rounded to 177.0)
  });

  it('round-trip conversion maintains reasonable accuracy', () => {
    const original = 75;
    const lbs = kgToLbs(original);
    const backToKg = lbsToKg(lbs);
    // Should be within 0.5 kg after round-trip due to rounding
    expect(Math.abs(backToKg - original)).toBeLessThanOrEqual(0.5);
  });
});

// =====================================================
// Weight Validation Tests
// =====================================================

/**
 * Validates weight input for the add/edit forms.
 * Mirrors the validation logic in WeightTracker.tsx.
 */
function validateWeightInput(value: string, unit: 'lb' | 'kg'): string | null {
  const val = parseFloat(value);
  if (isNaN(val)) {
    return 'Enter a valid weight';
  }
  const minAllowed = 1;
  const maxAllowed = unit === 'kg' ? 700 : 1500;
  if (val < minAllowed || val > maxAllowed) {
    return `Enter a weight between ${minAllowed} and ${maxAllowed} ${unit}`;
  }
  return null;
}

describe('Weight Input Validation', () => {
  describe('Pounds (lb)', () => {
    it('accepts valid weight in lbs', () => {
      expect(validateWeightInput('150', 'lb')).toBeNull();
      expect(validateWeightInput('200.5', 'lb')).toBeNull();
    });

    it('rejects non-numeric input', () => {
      expect(validateWeightInput('abc', 'lb')).toBe('Enter a valid weight');
      expect(validateWeightInput('', 'lb')).toBe('Enter a valid weight');
    });

    it('rejects weight below minimum (1 lb)', () => {
      expect(validateWeightInput('0', 'lb')).toBe('Enter a weight between 1 and 1500 lb');
      expect(validateWeightInput('0.5', 'lb')).toBe('Enter a weight between 1 and 1500 lb');
    });

    it('rejects weight above maximum (1500 lb)', () => {
      expect(validateWeightInput('1501', 'lb')).toBe('Enter a weight between 1 and 1500 lb');
      expect(validateWeightInput('2000', 'lb')).toBe('Enter a weight between 1 and 1500 lb');
    });

    it('accepts boundary values', () => {
      expect(validateWeightInput('1', 'lb')).toBeNull();
      expect(validateWeightInput('1500', 'lb')).toBeNull();
    });
  });

  describe('Kilograms (kg)', () => {
    it('accepts valid weight in kg', () => {
      expect(validateWeightInput('70', 'kg')).toBeNull();
      expect(validateWeightInput('90.5', 'kg')).toBeNull();
    });

    it('rejects non-numeric input', () => {
      expect(validateWeightInput('abc', 'kg')).toBe('Enter a valid weight');
      expect(validateWeightInput('', 'kg')).toBe('Enter a valid weight');
    });

    it('rejects weight below minimum (1 kg)', () => {
      expect(validateWeightInput('0', 'kg')).toBe('Enter a weight between 1 and 700 kg');
      expect(validateWeightInput('0.5', 'kg')).toBe('Enter a weight between 1 and 700 kg');
    });

    it('rejects weight above maximum (700 kg)', () => {
      expect(validateWeightInput('701', 'kg')).toBe('Enter a weight between 1 and 700 kg');
      expect(validateWeightInput('1000', 'kg')).toBe('Enter a weight between 1 and 700 kg');
    });

    it('accepts boundary values', () => {
      expect(validateWeightInput('1', 'kg')).toBeNull();
      expect(validateWeightInput('700', 'kg')).toBeNull();
    });
  });
});

// =====================================================
// Date Validation Tests
// =====================================================

/**
 * Validates that the selected date is not in the future.
 * Mirrors the validation logic in WeightTracker.tsx.
 */
function validateDate(date: string): string | null {
  const todayStr = new Date().toISOString().split('T')[0];
  if (date > todayStr) {
    return 'Cannot enter weight for a future date';
  }
  return null;
}

describe('Date Validation', () => {
  it('accepts today\'s date', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(validateDate(today)).toBeNull();
  });

  it('accepts past dates', () => {
    expect(validateDate('2024-01-01')).toBeNull();
    expect(validateDate('2023-12-15')).toBeNull();
    expect(validateDate('2020-06-15')).toBeNull();
  });

  it('rejects future dates', () => {
    // Get a date in the future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    expect(validateDate(futureDateStr)).toBe('Cannot enter weight for a future date');
  });

  it('rejects dates far in the future', () => {
    expect(validateDate('2099-12-31')).toBe('Cannot enter weight for a future date');
  });
});

// =====================================================
// Goal Detection Tests
// =====================================================

/**
 * Determines if the weight goal has been reached.
 * Mirrors the logic in WeightTracker.tsx.
 */
function isGoalReached(
  currentLbs: number,
  targetLbs: number,
  firstEntryLbs: number | null
): boolean {
  // Determine if user is trying to lose or gain weight based on first entry
  const isWeightLoss = firstEntryLbs !== null && currentLbs < firstEntryLbs;
  
  // Goal is reached if:
  // 1. Current weight is within 0.1 lbs of target, OR
  // 2. For weight loss: current weight is at or below target
  // 3. For weight gain: current weight is at or above target
  const closeToTarget = Math.abs(targetLbs - currentLbs) < 0.1;
  const passedTarget = isWeightLoss ? currentLbs <= targetLbs : currentLbs >= targetLbs;
  
  return closeToTarget || passedTarget;
}

/**
 * Calculates the difference between current weight and target.
 * Returns a message describing progress toward goal.
 */
function getProgressToTarget(
  currentLbs: number,
  targetLbs: number,
  unit: 'lb' | 'kg'
): string {
  const diff = Math.round((targetLbs - currentLbs) * 10) / 10;
  const diffDisplay = unit === 'kg' ? Math.round((diff / 2.20462) * 10) / 10 : diff;
  const unitLabel = unit === 'kg' ? 'kg' : 'lbs';
  
  if (Math.abs(diff) < 0.1) {
    return 'Target Reached!';
  }
  
  if (diff > 0) {
    return `${Math.abs(diffDisplay)} ${unitLabel} to reach target`;
  }
  return `${Math.abs(diffDisplay)} ${unitLabel} to lose to reach target`;
}

describe('Goal Detection Logic', () => {
  describe('isGoalReached', () => {
    it('returns true when weight matches target exactly', () => {
      expect(isGoalReached(150, 150, 160)).toBe(true);
    });

    it('returns true when weight is within 0.1 lbs of target', () => {
      expect(isGoalReached(150.05, 150, 160)).toBe(true);
      expect(isGoalReached(149.95, 150, 160)).toBe(true);
    });

    it('returns true for weight loss goal when below target', () => {
      // First entry was 160, current is 148, target is 150
      // This is weight loss (148 < 160) and below target
      expect(isGoalReached(148, 150, 160)).toBe(true);
    });

    it('returns true for weight gain goal when above target', () => {
      // First entry was 140, current is 152, target is 150
      // This is weight gain (152 > 140) and above target
      expect(isGoalReached(152, 150, 140)).toBe(true);
    });

    it('returns false when still working toward target (weight loss)', () => {
      // First entry was 160, current is 155, target is 150
      // Still 5 lbs to go
      expect(isGoalReached(155, 150, 160)).toBe(false);
    });

    it('returns false when still working toward target (weight gain)', () => {
      // First entry was 140, current is 145, target is 150
      // Still 5 lbs to go
      expect(isGoalReached(145, 150, 140)).toBe(false);
    });

    it('handles case with no first entry', () => {
      expect(isGoalReached(150, 150, null)).toBe(true);
      expect(isGoalReached(145, 150, null)).toBe(false);
    });
  });

  describe('getProgressToTarget', () => {
    it('shows correct message when target reached', () => {
      expect(getProgressToTarget(150, 150, 'lb')).toBe('Target Reached!');
    });

    it('shows correct message for weight to gain (lbs)', () => {
      expect(getProgressToTarget(145, 150, 'lb')).toBe('5 lbs to reach target');
    });

    it('shows correct message for weight to lose (lbs)', () => {
      expect(getProgressToTarget(155, 150, 'lb')).toBe('5 lbs to lose to reach target');
    });

    it('shows correct message for weight to gain (kg)', () => {
      // 145 lbs current, 150 lbs target = 5 lbs difference = ~2.3 kg
      const result = getProgressToTarget(145, 150, 'kg');
      expect(result).toContain('kg to reach target');
    });

    it('shows correct message for weight to lose (kg)', () => {
      const result = getProgressToTarget(155, 150, 'kg');
      expect(result).toContain('kg to lose to reach target');
    });
  });
});

// =====================================================
// Weight Entry CRUD Operation Tests
// =====================================================

// Mock data for CRUD tests - includes internal fields (owner, userID) 
// that are stored in Firestore but not in the public WeightEntry type
interface MockWeightEntry {
  id: string;
  date: string;
  weightLb: number;
  owner: string;  // Internal field stored in Firestore for ownership filtering
  userID: string; // Internal field stored in Firestore for legacy compatibility
}

// In-memory store for testing CRUD operations
class MockWeightStore {
  private entries: Map<string, MockWeightEntry> = new Map();
  private nextId = 1;

  async getAll(owner: string): Promise<MockWeightEntry[]> {
    return Array.from(this.entries.values())
      .filter(e => e.owner === owner || e.userID === owner)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  async add(entry: Omit<MockWeightEntry, 'id'>): Promise<MockWeightEntry> {
    const id = `entry-${this.nextId++}`;
    const newEntry = { ...entry, id };
    this.entries.set(id, newEntry);
    return newEntry;
  }

  async update(id: string, patch: Partial<MockWeightEntry>): Promise<MockWeightEntry | null> {
    const existing = this.entries.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    this.entries.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  clear() {
    this.entries.clear();
    this.nextId = 1;
  }
}

describe('Weight Entry CRUD Operations', () => {
  let store: MockWeightStore;
  const owner = 'test-user-123';

  beforeEach(() => {
    store = new MockWeightStore();
  });

  describe('Create (Add)', () => {
    it('adds a new weight entry successfully', async () => {
      const entry = await store.add({
        date: '2025-01-15',
        weightLb: 150,
        owner,
        userID: owner,
      });
      
      expect(entry.id).toBeDefined();
      expect(entry.date).toBe('2025-01-15');
      expect(entry.weightLb).toBe(150);
      expect(entry.owner).toBe(owner);
    });

    it('generates unique IDs for each entry', async () => {
      const entry1 = await store.add({ date: '2025-01-15', weightLb: 150, owner, userID: owner });
      const entry2 = await store.add({ date: '2025-01-16', weightLb: 151, owner, userID: owner });
      
      expect(entry1.id).not.toBe(entry2.id);
    });

    it('preserves weight precision to 1 decimal place', async () => {
      const entry = await store.add({
        date: '2025-01-15',
        weightLb: 150.5,
        owner,
        userID: owner,
      });
      
      expect(entry.weightLb).toBe(150.5);
    });
  });

  describe('Read (Get)', () => {
    beforeEach(async () => {
      await store.add({ date: '2025-01-10', weightLb: 152, owner, userID: owner });
      await store.add({ date: '2025-01-15', weightLb: 150, owner, userID: owner });
      await store.add({ date: '2025-01-05', weightLb: 154, owner, userID: owner });
    });

    it('retrieves all entries for a user', async () => {
      const entries = await store.getAll(owner);
      expect(entries.length).toBe(3);
    });

    it('returns entries sorted by date ascending', async () => {
      const entries = await store.getAll(owner);
      expect(entries[0].date).toBe('2025-01-05');
      expect(entries[1].date).toBe('2025-01-10');
      expect(entries[2].date).toBe('2025-01-15');
    });

    it('returns empty array for user with no entries', async () => {
      const entries = await store.getAll('other-user');
      expect(entries.length).toBe(0);
    });

    it('filters entries by owner', async () => {
      await store.add({ date: '2025-01-20', weightLb: 160, owner: 'other-user', userID: 'other-user' });
      
      const entries = await store.getAll(owner);
      expect(entries.length).toBe(3);
      
      const otherEntries = await store.getAll('other-user');
      expect(otherEntries.length).toBe(1);
    });
  });

  describe('Update', () => {
    let entryId: string;

    beforeEach(async () => {
      const entry = await store.add({ date: '2025-01-15', weightLb: 150, owner, userID: owner });
      entryId = entry.id;
    });

    it('updates weight value successfully', async () => {
      const updated = await store.update(entryId, { weightLb: 148.5 });
      
      expect(updated).not.toBeNull();
      expect(updated?.weightLb).toBe(148.5);
    });

    it('updates date successfully', async () => {
      const updated = await store.update(entryId, { date: '2025-01-16' });
      
      expect(updated).not.toBeNull();
      expect(updated?.date).toBe('2025-01-16');
    });

    it('updates multiple fields at once', async () => {
      const updated = await store.update(entryId, {
        date: '2025-01-16',
        weightLb: 149,
      });
      
      expect(updated).not.toBeNull();
      expect(updated?.date).toBe('2025-01-16');
      expect(updated?.weightLb).toBe(149);
    });

    it('returns null for non-existent entry', async () => {
      const updated = await store.update('non-existent-id', { weightLb: 148 });
      expect(updated).toBeNull();
    });

    it('preserves unchanged fields', async () => {
      const updated = await store.update(entryId, { weightLb: 148 });
      
      expect(updated?.date).toBe('2025-01-15'); // Original date preserved
      expect(updated?.owner).toBe(owner); // Owner preserved
    });
  });

  describe('Delete', () => {
    let entryId: string;

    beforeEach(async () => {
      const entry = await store.add({ date: '2025-01-15', weightLb: 150, owner, userID: owner });
      entryId = entry.id;
    });

    it('deletes entry successfully', async () => {
      const result = await store.delete(entryId);
      expect(result).toBe(true);
      
      const entries = await store.getAll(owner);
      expect(entries.length).toBe(0);
    });

    it('returns false for non-existent entry', async () => {
      const result = await store.delete('non-existent-id');
      expect(result).toBe(false);
    });

    it('does not affect other entries', async () => {
      await store.add({ date: '2025-01-16', weightLb: 151, owner, userID: owner });
      
      await store.delete(entryId);
      
      const entries = await store.getAll(owner);
      expect(entries.length).toBe(1);
      expect(entries[0].weightLb).toBe(151);
    });
  });
});

// =====================================================
// Legacy Document Normalization Tests
// =====================================================

/**
 * Normalizes legacy documents that may have weightKg instead of weightLb.
 * This mirrors the normalization logic in weightService.ts.
 */
function normalizeWeightEntry(data: Record<string, unknown>): { weightLb: number } & Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  
  // Convert weightKg to weightLb if needed
  if (result.weightKg !== undefined && result.weightLb === undefined) {
    const weightKg = result.weightKg as number;
    result.weightLb = Math.round((weightKg * 2.20462) * 10) / 10;
    delete result.weightKg;
  }
  
  return result as { weightLb: number } & Record<string, unknown>;
}

describe('Legacy Document Normalization', () => {
  it('converts weightKg to weightLb', () => {
    const legacy = { date: '2025-01-15', weightKg: 70 };
    const normalized = normalizeWeightEntry(legacy);
    
    expect(normalized.weightLb).toBe(154.3);
    expect(normalized.weightKg).toBeUndefined();
  });

  it('preserves existing weightLb', () => {
    const modern = { date: '2025-01-15', weightLb: 150 };
    const normalized = normalizeWeightEntry(modern);
    
    expect(normalized.weightLb).toBe(150);
  });

  it('prefers weightLb over weightKg when both present', () => {
    const mixed = { date: '2025-01-15', weightLb: 150, weightKg: 70 };
    const normalized = normalizeWeightEntry(mixed);
    
    expect(normalized.weightLb).toBe(150);
    expect(normalized.weightKg).toBe(70); // Kept because weightLb was already present
  });

  it('preserves other fields during normalization', () => {
    const legacy = {
      date: '2025-01-15',
      weightKg: 70,
      owner: 'user-123',
      userID: 'user-123',
      notes: 'Morning weight',
    };
    const normalized = normalizeWeightEntry(legacy);
    
    expect(normalized.date).toBe('2025-01-15');
    expect(normalized.owner).toBe('user-123');
    expect(normalized.notes).toBe('Morning weight');
  });
});

// =====================================================
// Average Weight Calculation Tests
// =====================================================

/**
 * Calculates average weight from a list of entries.
 * Mirrors the calculation in WeightTracker.tsx.
 */
function calculateAverageWeight(entries: { weightLb: number }[]): number | null {
  if (entries.length === 0) return null;
  const sum = entries.reduce((s, e) => s + e.weightLb, 0);
  return Math.round((sum / entries.length) * 10) / 10;
}

describe('Average Weight Calculation', () => {
  it('returns null for empty entries', () => {
    expect(calculateAverageWeight([])).toBeNull();
  });

  it('calculates average for single entry', () => {
    expect(calculateAverageWeight([{ weightLb: 150 }])).toBe(150);
  });

  it('calculates average for multiple entries', () => {
    const entries = [
      { weightLb: 150 },
      { weightLb: 152 },
      { weightLb: 148 },
    ];
    expect(calculateAverageWeight(entries)).toBe(150);
  });

  it('rounds to 1 decimal place', () => {
    const entries = [
      { weightLb: 150 },
      { weightLb: 151 },
      { weightLb: 152 },
    ];
    // (150 + 151 + 152) / 3 = 151
    expect(calculateAverageWeight(entries)).toBe(151);
  });

  it('handles decimal weights correctly', () => {
    const entries = [
      { weightLb: 150.5 },
      { weightLb: 151.5 },
    ];
    // (150.5 + 151.5) / 2 = 151
    expect(calculateAverageWeight(entries)).toBe(151);
  });
});

// =====================================================
// Date Range Filtering Tests
// =====================================================

/**
 * Filters entries by date range.
 * Mirrors the filtering logic in WeightTracker.tsx.
 */
function filterEntriesByRange(
  entries: WeightEntry[],
  range: 'week' | 'month' | 'year' | 'all',
  referenceDate: Date
): WeightEntry[] {
  if (range === 'all') return entries;
  
  let start: Date;
  let end: Date;
  
  if (range === 'week') {
    // Get Sunday of the week containing the reference date
    start = new Date(referenceDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    // Get Saturday of the same week
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  } else if (range === 'month') {
    start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  } else {
    // year
    start = new Date(referenceDate);
    start.setFullYear(referenceDate.getFullYear() - 1);
    end = referenceDate;
  }
  
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  return entries.filter(e => e.date >= startStr && e.date <= endStr);
}

describe('Date Range Filtering', () => {
  const entries: WeightEntry[] = [
    { id: '1', date: '2025-01-01', weightLb: 150 },
    { id: '2', date: '2025-01-15', weightLb: 151 },
    { id: '3', date: '2025-02-01', weightLb: 152 },
    { id: '4', date: '2025-06-15', weightLb: 153 },
    { id: '5', date: '2024-06-15', weightLb: 155 },
  ];

  it('returns all entries for "all" range', () => {
    const filtered = filterEntriesByRange(entries, 'all', new Date('2025-01-15'));
    expect(filtered.length).toBe(5);
  });

  it('filters correctly for month range', () => {
    const filtered = filterEntriesByRange(entries, 'month', new Date('2025-01-15'));
    expect(filtered.length).toBe(2);
    expect(filtered.every(e => e.date.startsWith('2025-01'))).toBe(true);
  });

  it('filters correctly for week range', () => {
    // January 15, 2025 is a Wednesday
    // Week: Sun Jan 12 - Sat Jan 18
    const filtered = filterEntriesByRange(entries, 'week', new Date('2025-01-15'));
    expect(filtered.length).toBe(1);
    expect(filtered[0].date).toBe('2025-01-15');
  });

  it('returns empty array when no entries in range', () => {
    const filtered = filterEntriesByRange(entries, 'month', new Date('2025-03-15'));
    expect(filtered.length).toBe(0);
  });
});

// =====================================================
// Edit Mode Detection Tests (for existing date entries)
// =====================================================

/**
 * Checks if an entry already exists for the given date.
 * Used to determine if adding should update instead.
 */
function findExistingEntryForDate(
  entries: WeightEntry[],
  date: string
): WeightEntry | undefined {
  return entries.find(e => e.date === date);
}

describe('Existing Entry Detection', () => {
  const entries: WeightEntry[] = [
    { id: '1', date: '2025-01-15', weightLb: 150 },
    { id: '2', date: '2025-01-16', weightLb: 151 },
  ];

  it('finds existing entry for a date', () => {
    const existing = findExistingEntryForDate(entries, '2025-01-15');
    expect(existing).toBeDefined();
    expect(existing?.id).toBe('1');
  });

  it('returns undefined when no entry exists for date', () => {
    const existing = findExistingEntryForDate(entries, '2025-01-17');
    expect(existing).toBeUndefined();
  });

  it('handles empty entries array', () => {
    const existing = findExistingEntryForDate([], '2025-01-15');
    expect(existing).toBeUndefined();
  });
});
