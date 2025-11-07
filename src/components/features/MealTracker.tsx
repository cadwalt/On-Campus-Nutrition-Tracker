import React, { useState } from 'react';
import { estimateNutritionForItem } from '../../utils/nutritionLookup';
import type { NutritionValues } from '../../utils/nutritionLookup';
import { Tooltip } from '../ui';

type MealEntry = {
  id: string;
  time: string;
  name: string;
  sizeLabel: string;
  nutrition: NutritionValues;
};

const SIZE_MULTIPLIERS: Record<string, number> = {
  Snack: 0.5,
  Small: 0.75,
  Bowl: 1.0,
  'Large Bowl': 1.5,
  Plate: 1.8,
};

function formatNumber(n: number) {
  return Math.round(n);
}

const MealTracker: React.FC = () => {
  const [name, setName] = useState('');
  const [size, setSize] = useState('Bowl');
  const [entries, setEntries] = useState<MealEntry[]>([]);

  const totals = entries.reduce(
    (acc, e) => {
      acc.calories += e.nutrition.calories;
      acc.protein += e.nutrition.protein;
      acc.carbs += e.nutrition.carbs;
      acc.fat += e.nutrition.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleAdd = () => {
    if (!name.trim()) return;
    const base = estimateNutritionForItem(name.trim());
    const mult = SIZE_MULTIPLIERS[size] ?? 1;
    const nutrition: NutritionValues = {
      calories: base.calories * mult,
      protein: base.protein * mult,
      carbs: base.carbs * mult,
      fat: base.fat * mult,
    };

    const entry: MealEntry = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      name: name.trim(),
      sizeLabel: size,
      nutrition,
    };

    setEntries((prev) => [entry, ...prev]);
    setName('');
    setSize('Bowl');
  };

  const handleRemove = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="card meal-tracker">
      <div className="section-header">
        <h2>Meal Tracker</h2>
      </div>

      <div className="meal-tracker-controls">
        <input
          className="prompt-input meal-input"
          placeholder="What did you eat? e.g. Chicken salad, Oatmeal"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="size-select-wrapper">
          <span className="size-icon" aria-hidden>
            {/* simple plate icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" fill="rgba(255,255,255,0.03)" />
              <circle cx="12" cy="12" r="3.2" fill="currentColor" />
            </svg>
          </span>

          <select className="size-select" value={size} onChange={(e) => setSize(e.target.value)}>
            {Object.keys(SIZE_MULTIPLIERS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <Tooltip
            content="Tap to view what each size roughly corresponds to."
            example={`Snack — small items like fruit or a handful of nuts; Small — half sandwich or small salad; Bowl — cereal bowl or regular grain+protein bowl; Large Bowl — large ramen/pasta; Plate — burger + sides`}
          />
        </div>

        <button className="response-button" onClick={handleAdd}>
          Add Meal
        </button>
      </div>

      <div className="meal-tracker-totals">
        <div className="total-item">
          <div className="total-label">Calories</div>
          <div className="total-value">{formatNumber(totals.calories)}</div>
        </div>
        <div className="total-item">
          <div className="total-label">Protein (g)</div>
          <div className="total-value">{formatNumber(totals.protein)}</div>
        </div>
        <div className="total-item">
          <div className="total-label">Carbs (g)</div>
          <div className="total-value">{formatNumber(totals.carbs)}</div>
        </div>
        <div className="total-item">
          <div className="total-label">Fat (g)</div>
          <div className="total-value">{formatNumber(totals.fat)}</div>
        </div>
      </div>

      {/* size help moved into Tooltip popup */}

      <div className="meal-list">
        {entries.map((e) => (
          <div key={e.id} className="meal-item">
            <div className="meal-left">
              <div className="meal-time">{e.time}</div>
              <div className="meal-name">
                {e.name} <small style={{ color: '#94a3b8' }}>({e.sizeLabel})</small>
              </div>
            </div>
            <div className="meal-right">
              <div className="meal-calories">{formatNumber(e.nutrition.calories)} cal</div>
              <button className="cancel-button" onClick={() => handleRemove(e.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealTracker;
