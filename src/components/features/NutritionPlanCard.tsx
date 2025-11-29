import React, { useEffect, useState } from 'react';

const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firestore };
};
import type { NutritionGoals } from '../../types/nutrition';
import { computeNutritionPlan } from '../../utils/nutritionPlan';

const NutritionPlanCard: React.FC = () => {
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { authClient, dbClient, firestore } = await resolveFirebase();
        const u = authClient.currentUser;
        if (!u) {
          setGoals(null);
          setLoading(false);
          return;
        }
        const ref = firestore.doc(dbClient, 'users', u.uid);
        const unsub = firestore.onSnapshot(ref, (snap: any) => {
          const data = snap.data();
          setGoals((data?.nutrition_goals as NutritionGoals) || null);
          setLoading(false);
        });
        return () => unsub();
      } catch (err) {
        console.error('Failed to load nutrition plan', err);
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="card"><h2>Nutrition Plan</h2><div className="muted">Loading...</div></div>
    );
  }

  if (!goals) {
    return (
      <div className="card">
        <h2>Nutrition Plan</h2>
        <p> </p>
        <p className="muted">No nutrition goals yet. Set your goals to get a personalized plan.</p>
        <div style={{ marginTop: 12 }}>
          <a className="response-button" href="/profile">Set Goals</a>
        </div>
      </div>
    );
  }

  const plan = computeNutritionPlan(goals);
  if (!plan) {
    return (
      <div className="card">
        <h2>Nutrition Plan</h2>
        <p className="muted">Please complete your primary goal and activity level to see recommendations.</p>
        <div style={{ marginTop: 12 }}>
          <a className="response-button" href="/profile">Edit Goals</a>
        </div>
      </div>
    );
  }

  const adjLabel = plan.adjustmentPercent === 0
    ? 'Maintenance'
    : plan.adjustmentPercent > 0
      ? `Surplus ${Math.round(plan.adjustmentPercent*100)}%`
      : `Deficit ${Math.round(Math.abs(plan.adjustmentPercent)*100)}%`;

  return (
    <div className="card">
      <h2>Nutrition Plan</h2>
      <div className="stats-grid" style={{ marginTop: 8 }}>
        <div className="stat-item">
          <div className="stat-number">{plan.maintenanceCalories}</div>
          <div className="stat-label">Estimated Maintenance</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{plan.targetCalories}</div>
          <div className="stat-label">Target Calories ({adjLabel})</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{plan.macroGrams.protein}g</div>
          <div className="stat-label">Protein / day</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{plan.macroGrams.carbs}g</div>
          <div className="stat-label">Carbs / day</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{plan.macroGrams.fat}g</div>
          <div className="stat-label">Fat / day</div>
        </div>
      </div>
      {plan.perMeal && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Per-Meal Targets</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="total-item"><div className="total-label">Calories</div><div className="total-value">{plan.perMeal.calories}</div></div>
            <div className="total-item"><div className="total-label">Protein</div><div className="total-value">{plan.perMeal.protein}g</div></div>
            <div className="total-item"><div className="total-label">Carbs</div><div className="total-value">{plan.perMeal.carbs}g</div></div>
            <div className="total-item"><div className="total-label">Fat</div><div className="total-value">{plan.perMeal.fat}g</div></div>
          </div>
        </div>
      )}
      {plan.notes.length > 0 && (
        <ul style={{ marginTop: 12, color: '#9aa7bf', fontSize: 14, paddingLeft: 18 }}>
          {plan.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
};

export default NutritionPlanCard;
