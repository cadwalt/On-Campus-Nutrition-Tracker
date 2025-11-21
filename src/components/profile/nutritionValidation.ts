export type PhysicalMetricsParams = {
  currentWeight?: number | '';
  targetWeight?: number | '';
  height?: number | '';
  primaryGoal?: string | undefined;
};

export function validatePhysicalMetricsValues({
  currentWeight,
  targetWeight,
  height,
  primaryGoal
}: PhysicalMetricsParams): string[] {
  const errors: string[] = [];

  if (currentWeight && (currentWeight < 50 || currentWeight > 500)) {
    errors.push('Current weight must be between 50 and 500 pounds');
  }

  if (targetWeight && (targetWeight < 50 || targetWeight > 500)) {
    errors.push('Target weight must be between 50 and 500 pounds');
  }

  if (height && (height < 36 || height > 96)) {
    errors.push('Height must be between 36 and 96 inches');
  }

  if (currentWeight && targetWeight && primaryGoal) {
    if (primaryGoal === 'lose_weight' && targetWeight >= currentWeight) {
      errors.push('Target weight should be less than current weight for weight loss');
    }
    if (primaryGoal === 'gain_weight' && targetWeight <= currentWeight) {
      errors.push('Target weight should be greater than current weight for weight gain');
    }
  }

  return errors;
}
