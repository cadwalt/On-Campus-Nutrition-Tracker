import { describe, it, expect } from 'vitest';
import { validatePhysicalMetricsValues } from '../components/profile/nutritionValidation';

describe('validatePhysicalMetricsValues', () => {
  it('returns error when current weight is below 50', () => {
    const errs = validatePhysicalMetricsValues({ currentWeight: 40 });
    expect(errs).toContain('Current weight must be between 50 and 500 pounds');
  });

  it('returns error when current weight is above 500', () => {
    const errs = validatePhysicalMetricsValues({ currentWeight: 600 });
    expect(errs).toContain('Current weight must be between 50 and 500 pounds');
  });

  it('returns error when target weight is below 50', () => {
    const errs = validatePhysicalMetricsValues({ targetWeight: 30 });
    expect(errs).toContain('Target weight must be between 50 and 500 pounds');
  });

  it('returns error when target weight is above 500', () => {
    const errs = validatePhysicalMetricsValues({ targetWeight: 800 });
    expect(errs).toContain('Target weight must be between 50 and 500 pounds');
  });

  it('returns error when height is less than 36 inches', () => {
    const errs = validatePhysicalMetricsValues({ height: 30 });
    expect(errs).toContain('Height must be between 36 and 96 inches');
  });

  it('returns error when height is greater than 96 inches', () => {
    const errs = validatePhysicalMetricsValues({ height: 120 });
    expect(errs).toContain('Height must be between 36 and 96 inches');
  });

  it('returns error for lose_weight when target >= current', () => {
    const errs = validatePhysicalMetricsValues({ currentWeight: 180, targetWeight: 185, primaryGoal: 'lose_weight' });
    expect(errs).toContain('Target weight should be less than current weight for weight loss');
  });

  it('returns error for gain_weight when target <= current', () => {
    const errs = validatePhysicalMetricsValues({ currentWeight: 170, targetWeight: 160, primaryGoal: 'gain_weight' });
    expect(errs).toContain('Target weight should be greater than current weight for weight gain');
  });

  it('returns no errors for valid inputs', () => {
    const errs = validatePhysicalMetricsValues({ currentWeight: 150, targetWeight: 140, height: 70 });
    expect(errs.length).toBe(0);
  });
});
