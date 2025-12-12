/**
 * Weight tracker business logic
 * Handles state management and calculations
 * Separates from UI rendering concerns
 */

import type { WeightEntry } from '../types/weight';
import {
  parseAndValidateWeight,
  validateDateNotFuture,
  roundWeight,
  convertAndRoundWeight,
} from './weightValidation';
import {
  filterEntriesByRange,
  getAggregatedEntries,
  getSafeAverageOrFirst,
  formatTableRows,
} from './weightAggregation';
import { parseLocalDate, getTodayAsString, calculateDateRange } from './dateUtils';

/**
 * Validates and converts weight input for storage
 * Throws error with user-friendly message if invalid
 */
export function processWeightInput(
  weightInput: string,
  unit: 'kg' | 'lb',
  dateInput: string
): { weightLb: number; date: string } {
  // Validate inputs
  const weight = parseAndValidateWeight(weightInput, unit);
  validateDateNotFuture(dateInput);

  // Convert to lbs if needed
  const weightLb = unit === 'lb' ? weight : (weight * 2.20462);
  const rounded = roundWeight(weightLb);

  return {
    weightLb: rounded,
    date: dateInput,
  };
}

/**
 * Checks if a weight entry already exists for a given date
 * Pure function: no side effects
 */
export function findExistingEntry(
  entries: WeightEntry[],
  date: string
): WeightEntry | undefined {
  return entries.find((e) => e.date === date);
}

/**
 * Gets displayed weight in target unit
 * Pure function: no side effects
 */
export function getDisplayWeight(
  weightLb: number,
  unit: 'kg' | 'lb'
): number {
  return unit === 'lb' ? weightLb : convertAndRoundWeight(weightLb, 'kg');
}

/**
 * Calculates average weight for filtered period
 * Returns null if no entries
 */
export function calculateAverageForPeriod(
  entries: WeightEntry[]
): number | null {
  if (entries.length === 0) return null;

  try {
    const weights = entries.map((e) => e.weightLb);
    const avg = getSafeAverageOrFirst(weights);
    return roundWeight(avg);
  } catch (err) {
    console.warn('Average calculation error:', err);
    return null;
  }
}

/**
 * Prepares data for chart rendering
 * Does one thing: prepare chart data
 */
export function prepareChartData(
  entries: WeightEntry[],
  range: 'week' | 'month' | 'year' | 'all',
  referenceDate: Date
): WeightEntry[] {
  const filtered = filterEntriesByRange(entries, range, referenceDate);
  return getAggregatedEntries(filtered, range);
}

/**
 * Prepares data for table rendering
 * Does one thing: prepare table data
 */
export function prepareTableData(
  entries: WeightEntry[],
  range: 'week' | 'month' | 'year' | 'all',
  referenceDate: Date
) {
  const filtered = filterEntriesByRange(entries, range, referenceDate);
  const aggregated = getAggregatedEntries(filtered, range);
  return formatTableRows(aggregated);
}

/**
 * Determines if user has reached weight goal
 * Pure function: no side effects
 */
export function hasReachedGoal(
  currentWeight: number,
  targetWeight: number,
  allEntries: WeightEntry[]
): boolean {
  if (Math.abs(targetWeight - currentWeight) < 0.1) {
    return true;
  }

  // Determine direction: if latest weight < first weight, it's weight loss
  if (allEntries.length > 0) {
    const isWeightLoss = currentWeight < allEntries[0].weightLb;
    return isWeightLoss ? currentWeight <= targetWeight : currentWeight >= targetWeight;
  }

  return false;
}

/**
 * Calculates remaining weight to goal
 * Returns positive/negative difference
 */
export function calculateWeightDifference(
  currentWeight: number,
  targetWeight: number,
  unit: 'kg' | 'lb'
): number {
  const diffLb = targetWeight - currentWeight;
  return unit === 'lb' ? roundWeight(diffLb) : convertAndRoundWeight(diffLb, 'kg');
}

/**
 * Generates target message for display
 * Pure function: no side effects
 */
export function generateTargetMessage(
  targetWeight: number | null,
  latestEntry: WeightEntry | undefined,
  allEntries: WeightEntry[],
  unit: 'kg' | 'lb'
): string | null {
  if (!targetWeight) return null;

  if (!latestEntry) {
    const targetDisplay = getDisplayWeight(targetWeight, unit);
    const unitLabel = unit === 'kg' ? 'kg' : 'lbs';
    return `No weight entries yet — add your first entry to see progress toward ${targetDisplay} ${unitLabel}.`;
  }

  const latestLbs = latestEntry.weightLb;
  const hasReached = hasReachedGoal(latestLbs, targetWeight, allEntries);

  if (hasReached) {
    return 'Great Job! Target Reached!';
  }

  const diff = calculateWeightDifference(latestLbs, targetWeight, unit);
  const unitLabel = unit === 'kg' ? 'kg' : 'lbs';

  if (diff > 0) {
    return `${Math.abs(diff)} ${unitLabel} to reach target`;
  }

  return `${Math.abs(diff)} ${unitLabel} to lose to reach target`;
}

/**
 * Determines if an entry is the most recent
 * Used to show congratulations modal
 */
export function isLatestEntry(entryDate: string, entries: WeightEntry[]): boolean {
  if (entries.length === 0) return true;

  const allDates = entries.map((e) => e.date);
  const latestDate = allDates.reduce((a, b) => (a > b ? a : b));

  return entryDate === latestDate;
}

/**
 * Gets date range label for display
 * Pure function: formatting only
 */
export function getRangeLabel(
  range: 'week' | 'month' | 'year' | 'all',
  referenceDate: Date,
  selectedDate: string
): string {
  const { start, end } = calculateDateRange(range, referenceDate);

  switch (range) {
    case 'week':
      const weekStart = start.toLocaleString('default', { month: 'short' });
      const weekEnd = end.toLocaleString('default', { month: 'short' });
      const startDay = start.getDate();
      const endDay = end.getDate();
      const year = end.getFullYear();
      if (weekStart === weekEnd) {
        return `${weekStart} ${startDay} - ${endDay}, ${year}`;
      }
      return `${weekStart} ${startDay} - ${weekEnd} ${endDay}, ${year}`;

    case 'month':
      const d = parseLocalDate(selectedDate);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });

    case 'year':
      return `Last 12 months`;

    case 'all':
      return `All time`;
  }
}
