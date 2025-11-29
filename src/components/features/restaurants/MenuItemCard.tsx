import React from 'react';
import type { MenuItem } from '../../../utils/sampleRestaurantData';
import { AlertTriangleIcon } from '../../ui/Icons';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToMeals: (item: MenuItem) => void;
  userAllergens?: string[];
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onAddToMeals, userAllergens = [] }) => {
  const hasUserAllergen = item.allergens.some((allergen) => userAllergens.includes(allergen));

  return (
    <div
      style={{
        padding: '1rem',
        background: hasUserAllergen 
          ? 'rgba(239, 68, 68, 0.1)' 
          : 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${hasUserAllergen 
          ? 'rgba(239, 68, 68, 0.3)' 
          : 'rgba(255, 255, 255, 0.1)'}`,
        borderRadius: '8px',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '1rem' }}>{item.name}</h4>
          {item.description && (
            <p style={{ 
              fontSize: '0.8125rem', 
              color: 'var(--muted, #9aa7bf)', 
              margin: 0,
              marginBottom: '0.5rem',
              lineHeight: 1.4
            }}>
              {item.description}
            </p>
          )}
        </div>
        <div style={{
          padding: '0.25rem 0.5rem',
          background: 'rgba(99, 102, 241, 0.2)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '4px',
          fontSize: '0.75rem',
          color: '#a5b4fc',
          whiteSpace: 'nowrap',
          marginLeft: '0.5rem'
        }}>
          {item.mealType}
        </div>
      </div>

      {/* Nutrition Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        padding: '0.75rem',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '6px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f59e0b' }}>
            {item.nutritionInfo.calories}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted, #9aa7bf)' }}>cal</div>
        </div>
        {item.nutritionInfo.protein !== undefined && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#60a5fa' }}>
              {item.nutritionInfo.protein}g
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted, #9aa7bf)' }}>protein</div>
          </div>
        )}
        {item.nutritionInfo.totalCarbs !== undefined && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#34d399' }}>
              {item.nutritionInfo.totalCarbs}g
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted, #9aa7bf)' }}>carbs</div>
          </div>
        )}
        {item.nutritionInfo.totalFat !== undefined && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fbbf24' }}>
              {item.nutritionInfo.totalFat}g
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted, #9aa7bf)' }}>fat</div>
          </div>
        )}
      </div>

      {/* Allergens */}
      {item.allergens.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted, #9aa7bf)', marginBottom: '0.25rem' }}>
            Allergens:
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {item.allergens.map((allergen) => (
              <span
                key={allergen}
                style={{
                  padding: '0.125rem 0.375rem',
                  background: userAllergens.includes(allergen)
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: `1px solid ${userAllergens.includes(allergen)
                    ? 'rgba(239, 68, 68, 0.5)'
                    : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '4px',
                  fontSize: '0.6875rem',
                  color: userAllergens.includes(allergen) ? '#fca5a5' : '#fff'
                }}
              >
                {allergen}
              </span>
            ))}
          </div>
          {hasUserAllergen && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '4px',
              fontSize: '0.75rem',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangleIcon size={16} style={{ color: '#fca5a5', flexShrink: 0 }} />
              <span>Contains your allergens</span>
            </div>
          )}
        </div>
      )}

      {/* Serving Size and Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--muted, #9aa7bf)' }}>
          {item.servingSize}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToMeals(item);
          }}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(99, 102, 241, 0.3)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
          }}
        >
          Add to Meals
        </button>
      </div>
    </div>
  );
};

export default MenuItemCard;

