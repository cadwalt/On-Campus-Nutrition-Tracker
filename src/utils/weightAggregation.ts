/**
 * Weight entry filtering and aggregation
 * Separates data transformation logic from component rendering
 * Single Responsibility: Filter and aggregate entries only
 */

import type { WeightEntry } from '../types/weight';
import { calculateDateRange, formatDateShort, formatMonthYear, extractYear, extractMonth } from './dateUtils';

/**
 * Single-responsibility interface for aggregated weight data
 */
export interface AggregatedWeightEntry {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  weightLb: number;
  label: string; // For display (empty for detail view, month/year for aggregated)
  isAggregated: boolean; // true = monthly/yearly average
}

/**
 * Filters entries by date range
 * Does one thing: filter only
 */
export function filterEntriesByRange(
  entries: WeightEntry[],
  range: 'week' | 'month' | 'year' | 'all',
  referenceDate: Date
): WeightEntry[] {
  if (range === 'all') {
    return [...entries].sort((a, b) => a.date.localeCompare(b.date));
  }

  const { start, end } = calculateDateRange(range, referenceDate);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  return entries
    .filter((e) => e.date >= startStr && e.date <= endStr)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Groups entries by month and returns average weight per month
 * Responsibility: Aggregate by month only
 */
export function aggregateByMonth(
  entries: WeightEntry[]
): Map<string, number[]> {
  const byMonth = new Map<string, number[]>();

  entries.forEach((e) => {
    const monthKey = extractMonth(e.date); // YYYY-MM
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, []);
    }
    byMonth.get(monthKey)!.push(e.weightLb);
  });

  return byMonth;
}

/**
 * Groups entries by year and returns average weight per year
 * Responsibility: Aggregate by year only
 */
export function aggregateByYear(
  entries: WeightEntry[]
): Map<string, number[]> {
  const byYear = new Map<string, number[]>();

  entries.forEach((e) => {
    const year = extractYear(e.date);
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }
    byYear.get(year)!.push(e.weightLb);
  });

  return byYear;
}

/**
 * Calculates safe average without side effects
 * Pure function: no mutations, only calculation
 */
export function calculateSafeAverage(weights: number[]): number {
  if (weights.length === 0) return 0;

  if (weights.length > 100000) {
    throw new Error('Too many entries for safe averaging');
  }

  let sum = 0;
  for (const w of weights) {
    if (!Number.isFinite(w)) {
      throw new Error('Invalid weight value: must be a finite number');
    }
    sum += w;
    if (!Number.isFinite(sum) || Math.abs(sum) > Number.MAX_SAFE_INTEGER) {
      throw new Error('Sum overflow during averaging');
    }
  }

  return sum / weights.length;
}

/**
 * Safe average with fallback
 * Returns first value if averaging fails
 */
export function getSafeAverageOrFirst(weights: number[]): number {
  try {
    return calculateSafeAverage(weights);
  } catch (err) {
    console.warn('Average calculation error:', err);
    return weights[0] || 0;
  }
}

/**
 * Converts aggregated monthly data to chart entries
 * Pure function: no side effects
 */
export function monthlyDataToChartEntries(
  monthlyData: Map<string, number[]>
): AggregatedWeightEntry[] {
  return Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthKey, weights]) => {
      const avg = getSafeAverageOrFirst(weights);
      const roundedAvg = Math.round(avg * 10) / 10;
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthLabel = date.toLocaleString('default', { month: 'long' });

      return {
        id: monthKey,
        date: monthKey + '-01',
        weightLb: roundedAvg,
        label: monthLabel,
        isAggregated: true,
      };
    });
}

/**
 * Converts aggregated yearly data to chart entries
 * Pure function: no side effects
 */
export function yearlyDataToChartEntries(
  yearlyData: Map<string, number[]>
): AggregatedWeightEntry[] {
  return Array.from(yearlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, weights]) => {
      const avg = getSafeAverageOrFirst(weights);
      const roundedAvg = Math.round(avg * 10) / 10;

      return {
        id: year,
        date: year + '-01-01',
        weightLb: roundedAvg,
        label: year,
        isAggregated: true,
      };
    });
}

/**
 * Gets aggregated entries for display based on view range
 * Responsibility: Delegate aggregation based on range
 */
export function getAggregatedEntries(
  entries: WeightEntry[],
  range: 'week' | 'month' | 'year' | 'all'
): AggregatedWeightEntry[] {
  if (range === 'year') {
    const monthlyData = aggregateByMonth(entries);
    return monthlyDataToChartEntries(monthlyData);
  }

  if (range === 'all') {
    const yearlyData = aggregateByYear(entries);
    return yearlyDataToChartEntries(yearlyData);
  }

  // For week and month, return individual entries as aggregated entries
  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    weightLb: e.weightLb,
    label: '',
    isAggregated: false,
  }));
}

/**
 * Formats aggregated entries for table display
 * Pure function: formatting only
 */
export function formatTableRows(
  entries: AggregatedWeightEntry[]
): Array<{
  date: string;
  label: string;
  weightLb: number;
  isAggregated: boolean;
  displayLabel: string;
}> {
  return entries.map((entry) => ({
    date: entry.date,
    label: entry.label,
    weightLb: entry.weightLb,
    isAggregated: entry.isAggregated,
    displayLabel: entry.label || formatDateShort(new Date(entry.date + 'T00:00:00')),
  }));
}
