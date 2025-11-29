import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../lib/resolveFirebase';
import type { Meal } from '../../types/meal';
import { calculateActualCalories, calculateActualMacros } from '../../utils/mealCalculations';

const TodaySummaryCard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [todayStats, setTodayStats] = useState({
    mealCount: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [loading, setLoading] = useState(true);

  // Track auth state
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveFirebase();
        unsub = firebaseAuth.onAuthStateChanged(auth, (u: User | null) => setUser(u));
      } catch (err) {
        console.error('Auth listener init failed', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Calculate today's intake from meals
  useEffect(() => {
    if (!user) {
      setTodayStats({ mealCount: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });
      setLoading(false);
      return;
    }

    let unsubLocal: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const mealsQ = firestore.query(firestore.collection(db, 'meals'), firestore.where('userId', '==', user.uid));
        unsubLocal = firestore.onSnapshot(mealsQ, (snap) => {
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

          let mealCount = 0;
          let calories = 0;
          let protein = 0;
          let carbs = 0;
          let fat = 0;

          const toMillis = (val: any): number => {
            if (typeof val === 'number') return val;
            if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
            if (val instanceof Date) return val.getTime();
            return 0;
          };

          snap.forEach((docSnap: any) => {
            const meal = docSnap.data() as Meal;
            const ms = toMillis(meal.createdAt);

            if (ms >= startOfToday && ms < endOfToday) {
              mealCount += 1;
              calories += calculateActualCalories(meal);
              const macros = calculateActualMacros(meal);
              protein += macros.protein || 0;
              carbs += macros.carbs || 0;
              fat += macros.fat || 0;
            }
          });

          setTodayStats({
            mealCount,
            calories: Math.round(calories),
            protein: Math.round(protein * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10,
          });
          setLoading(false);
        });
      } catch (err) {
        console.error('Meals snapshot failed', err);
        setLoading(false);
      }
    })();

    return () => { if (unsubLocal) unsubLocal(); };
  }, [user]);

  if (!user) {
    return (
      <div className="card">
        <h2>Today's Summary</h2>
        <p style={{ color: 'var(--muted, #9aa7bf)' }}>Sign in to see your daily summary</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <h2>Today's Summary</h2>
        <p style={{ color: 'var(--muted, #9aa7bf)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Today's Summary</h2>
        <div style={{
          padding: '0.25rem 0.75rem',
          background: 'rgba(99, 102, 241, 0.2)',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#a5b4fc'
        }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#fff',
            marginBottom: '0.25rem'
          }}>
            {todayStats.mealCount}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--muted, #9aa7bf)'
          }}>
            Meal{todayStats.mealCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#f59e0b',
            marginBottom: '0.25rem'
          }}>
            {todayStats.calories}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: 'var(--muted, #9aa7bf)'
          }}>
            Calories
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
        padding: '1rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#60a5fa',
            marginBottom: '0.25rem'
          }}>
            {todayStats.protein || 0}g
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--muted, #9aa7bf)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Protein
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#34d399',
            marginBottom: '0.25rem'
          }}>
            {todayStats.carbs || 0}g
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--muted, #9aa7bf)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Carbs
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#fbbf24',
            marginBottom: '0.25rem'
          }}>
            {todayStats.fat || 0}g
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--muted, #9aa7bf)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Fat
          </div>
        </div>
      </div>

      {todayStats.mealCount === 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: 'var(--muted, #9aa7bf)',
          textAlign: 'center'
        }}>
          No meals logged today. Start tracking your nutrition!
        </div>
      )}
    </div>
  );
};

export default TodaySummaryCard;

