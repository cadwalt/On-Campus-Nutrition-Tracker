/**
 * Weight validation utilities
 * Handles numeric validation, bounds checking, and safe conversions
 * Single Responsibility: Input validation only
 */

// Constants for weight bounds (avoids magic numbers)
const WEIGHT_BOUNDS = {
  MIN_WEIGHT: 1,
  MAX_WEIGHT_LB: 1500,
  MAX_WEIGHT_KG: 700,
  KG_TO_LB_FACTOR: 2.20462,
} as const;

/**
 * Validates if a value is a finite number
 * @throws Error if value is not finite
 */
export function validateFiniteNumber(value: number, fieldName: string = 'value'): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
}

/**
 * Validates if a weight value is within acceptable bounds
 * @throws Error if weight is out of bounds
 */
export function validateWeightBounds(
  weight: number,
  unit: 'kg' | 'lb'
): void {
  const min = WEIGHT_BOUNDS.MIN_WEIGHT;
  const max = unit === 'kg' ? WEIGHT_BOUNDS.MAX_WEIGHT_KG : WEIGHT_BOUNDS.MAX_WEIGHT_LB;

  if (weight < min || weight > max) {
    throw new Error(
      `Weight must be between ${min} and ${max} ${unit}`
    );
  }
}

/**
 * Parses and validates weight input
 * @throws Error if invalid
 */
export function parseAndValidateWeight(
  input: string,
  unit: 'kg' | 'lb'
): number {
  const value = parseFloat(input);

  if (isNaN(value)) {
    throw new Error(`Enter a valid weight in ${unit}`);
  }

  validateFiniteNumber(value, 'Weight');
  validateWeightBounds(value, unit);

  return value;
}

/**
 * Validates a date string (YYYY-MM-DD format)
 * Rejects future dates
 * @throws Error if invalid or in future
 */
export function validateDateNotFuture(dateStr: string): void {
  const todayStr = new Date().toISOString().split('T')[0];

  if (dateStr > todayStr) {
    throw new Error('Cannot enter data for a future date');
  }
}

/**
 * Safe weight conversion with overflow protection
 * @throws Error on overflow or invalid input
 */
export function safeConvertWeight(
  value: number,
  fromUnit: 'kg' | 'lb',
  toUnit: 'kg' | 'lb'
): number {
  if (fromUnit === toUnit) {
    return value;
  }

  validateFiniteNumber(value, 'Weight value');

  const factor = fromUnit === 'kg' ? WEIGHT_BOUNDS.KG_TO_LB_FACTOR : 1 / WEIGHT_BOUNDS.KG_TO_LB_FACTOR;
  const result = value * factor;

  if (!Number.isFinite(result)) {
    throw new Error(`Conversion overflow: ${value} ${fromUnit} exceeds safe range`);
  }

  // Check result doesn't exceed safe bounds
  const resultUnit = toUnit;
  const maxResult = resultUnit === 'kg' ? WEIGHT_BOUNDS.MAX_WEIGHT_KG : WEIGHT_BOUNDS.MAX_WEIGHT_LB;
  if (result > maxResult * 2) {
    throw new Error(`Conversion result exceeds safe range`);
  }

  return result;
}

/**
 * Rounds weight to 1 decimal place
 */
export function roundWeight(weight: number): number {
  return Math.round(weight * 10) / 10;
}

/**
 * Converts weight to target unit and rounds
 */
export function convertAndRoundWeight(
  weight: number,
  toUnit: 'kg' | 'lb'
): number {
  if (toUnit === 'lb') {
    return roundWeight(weight); // Already in lbs
  }
  return roundWeight(weight / WEIGHT_BOUNDS.KG_TO_LB_FACTOR);
}

/**
 * Formats weight for display
 */
export function formatWeightForDisplay(
  weight: number | null,
  unit: 'kg' | 'lb'
): string {
  if (weight === null) {
    return 'N/A';
  }
  return `${weight.toFixed(1)} ${unit}`;
}
