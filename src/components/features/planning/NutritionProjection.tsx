import React from 'react';
import type { NutritionPlan } from '../../../utils/nutritionPlan';

interface NutritionProjectionProps {
  projected: {
    calories: number;
    protein?: number;
    totalCarbs?: number;
    totalFat?: number;
  };
  targets: {
    calories: number;
    protein?: number;
    totalCarbs?: number;
    totalFat?: number;
  };
  nutritionPlan?: NutritionPlan | null;
}

const NutritionProjection: React.FC<NutritionProjectionProps> = ({
  projected,
  targets,
  nutritionPlan,
}) => {
  const getProgressColor = (current: number, target: number): string => {
    if (target === 0) return 'rgba(255, 255, 255, 0.1)';
    const percent = current / target;
    if (percent >= 0.9 && percent <= 1.1) return 'rgba(34, 197, 94, 0.3)';
    if (percent >= 0.7 && percent < 1.3) return 'rgba(234, 179, 8, 0.3)';
    return 'rgba(239, 68, 68, 0.3)';
  };

  const getProgressPercent = (current: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min(100, Math.max(0, (current / target) * 100));
  };

  const ProgressBar: React.FC<{ label: string; current: number; target: number; unit: string; color: string }> = ({
    label,
    current,
    target,
    unit,
    color,
  }) => {
    const percent = getProgressPercent(current, target);
    const bgColor = getProgressColor(current, target);

    return (
      <div style={{ marginBottom: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <span style={{ color: 'var(--muted, #9aa7bf)' }}>{label}</span>
          <span style={{ fontWeight: 600, color: '#fff' }}>
            {Math.round(current)} / {Math.round(target)} {unit}
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percent}%`,
            height: '100%',
            background: bgColor,
            borderRight: percent < 100 ? `2px solid ${color}` : 'none',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--muted, #9aa7bf)',
          marginTop: '0.25rem'
        }}>
          {percent.toFixed(0)}% of target
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '1.25rem',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px'
    }}>
      <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
        Projected Nutrition
      </h3>

      <ProgressBar
        label="Calories"
        current={projected.calories}
        target={targets.calories}
        unit="cal"
        color="#f59e0b"
      />

      {targets.protein !== undefined && (
        <ProgressBar
          label="Protein"
          current={projected.protein || 0}
          target={targets.protein}
          unit="g"
          color="#60a5fa"
        />
      )}

      {targets.totalCarbs !== undefined && (
        <ProgressBar
          label="Carbs"
          current={projected.totalCarbs || 0}
          target={targets.totalCarbs}
          unit="g"
          color="#34d399"
        />
      )}

      {targets.totalFat !== undefined && (
        <ProgressBar
          label="Fat"
          current={projected.totalFat || 0}
          target={targets.totalFat}
          unit="g"
          color="#fbbf24"
        />
      )}

      {nutritionPlan?.perMeal && (
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.8125rem',
          color: 'var(--muted, #9aa7bf)'
        }}>
          <div style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Per Meal Target:</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span>{Math.round(nutritionPlan.perMeal.calories)} cal</span>
            <span>{Math.round(nutritionPlan.perMeal.protein)}g protein</span>
            <span>{Math.round(nutritionPlan.perMeal.carbs)}g carbs</span>
            <span>{Math.round(nutritionPlan.perMeal.fat)}g fat</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionProjection;

