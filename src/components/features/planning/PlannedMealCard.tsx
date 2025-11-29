import React from 'react';
import type { Meal } from '../../../types/meal';
import { XIcon } from '../../ui/Icons';

interface PlannedMealCardProps {
  meal: Meal;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  onRemove: () => void;
}

const PlannedMealCard: React.FC<PlannedMealCardProps> = ({ meal, mealType, onRemove }) => {
  return (
    <div style={{
      padding: '1rem',
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      gap: '1rem'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{
            padding: '0.25rem 0.5rem',
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: '#a5b4fc',
            fontWeight: 500
          }}>
            {mealType}
          </span>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{meal.name}</h4>
        </div>

        {meal.servingSize && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--muted, #9aa7bf)', marginBottom: '0.5rem' }}>
            {meal.servingSize}
          </div>
        )}

        {/* Nutrition summary */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '0.8125rem',
          color: 'var(--muted, #9aa7bf)'
        }}>
          <span><strong style={{ color: '#f59e0b' }}>{meal.calories}</strong> cal</span>
          {meal.protein !== undefined && (
            <span><strong style={{ color: '#60a5fa' }}>{meal.protein}g</strong> protein</span>
          )}
          {meal.totalCarbs !== undefined && (
            <span><strong style={{ color: '#34d399' }}>{meal.totalCarbs}g</strong> carbs</span>
          )}
          {meal.totalFat !== undefined && (
            <span><strong style={{ color: '#fbbf24' }}>{meal.totalFat}g</strong> fat</span>
          )}
        </div>
      </div>

      <button
        onClick={onRemove}
        style={{
          padding: '0.375rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '4px',
          color: '#fca5a5',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.2s',
          flexShrink: 0
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
        }}
      >
        <XIcon size={16} />
      </button>
    </div>
  );
};

export default PlannedMealCard;

