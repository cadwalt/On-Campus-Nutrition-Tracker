// Nutrition Summary Component - Shows logged intake vs goals
import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../lib/resolveFirebase';
import type { Meal } from '../../types/meal';
import type { NutritionGoals } from '../../types/nutrition';
import { calculateActualCalories, calculateActualMacros } from '../../utils/mealCalculations';
import { computeNutritionPlan } from '../../utils/nutritionPlan';
import { mlToOz } from '../../types/water';

const NutritionSummary: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [todayIntake, setTodayIntake] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [waterMlToday, setWaterMlToday] = useState<number>(0);
  const [waterGoalMl, setWaterGoalMl] = useState<number | null>(null);

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

  // Load user's nutrition goals
  useEffect(() => {
    if (!user) {
      setGoals(null);
      setLoading(false);
      return;
    }

    const loadGoals = async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setGoals(data.nutrition_goals || null);
          // Read water goal and today's total if present
          const goal = data?.water?.goalMl;
          setWaterGoalMl(typeof goal === 'number' ? goal : null);
          const todayKey = new Date().toISOString().slice(0,10);
          const todayVal = data?.water?.daily?.[todayKey] || 0;
          setWaterMlToday(Math.round(todayVal));
        }
      } catch (error) {
        console.error('Error loading nutrition goals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [user]);

  // Subscribe to user doc for live water updates
  useEffect(() => {
    if (!user) return;
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        unsub = firestore.onSnapshot(userDocRef, (snap: any) => {
          if (!snap.exists()) {
            setWaterMlToday(0);
            return;
          }
          const data = snap.data() as any;
          const todayKey = new Date().toISOString().slice(0,10);
          const todayVal = data?.water?.daily?.[todayKey] || 0;
          setWaterMlToday(Math.round(todayVal));
          const goal = data?.water?.goalMl;
          setWaterGoalMl(typeof goal === 'number' ? goal : null);
        });
      } catch (err) {
        console.error('Failed to subscribe to user water updates', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [user]);

  // Calculate today's intake from meals
  useEffect(() => {
    if (!user) {
      setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
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
              calories += calculateActualCalories(meal);
              const macros = calculateActualMacros(meal);
              protein += macros.protein || 0;
              carbs += macros.carbs || 0;
              fat += macros.fat || 0;
            }
          });

          setTodayIntake({
            calories: Math.round(calories),
            protein: Math.round(protein * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10
          });
        });
      } catch (err) {
        console.error('Meals snapshot failed', err);
      }
    })();

    return () => { if (unsubLocal) unsubLocal(); };
  }, [user]);

  if (loading) {
    return (
      <div className="nutrition-summary-card">
        <h3>Nutrition Summary</h3>
        <p style={{ color: '#94a3b8' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="nutrition-summary-card">
        <h3>Nutrition Summary</h3>
        <p style={{ color: '#94a3b8' }}>Sign in to see your nutrition summary</p>
      </div>
    );
  }

  if (!goals || !goals.current_weight || !goals.activity_level) {
    return (
      <div className="nutrition-summary-card">
        <h3>Nutrition Summary</h3>
        <p style={{ color: '#94a3b8' }}>Set your nutrition goals in your profile to see your summary</p>
      </div>
    );
  }

  // Calculate target values using nutrition plan
  const plan = computeNutritionPlan(goals);
  
  if (!plan) {
    return (
      <div className="nutrition-summary-card">
        <h3>Nutrition Summary</h3>
        <p style={{ color: '#94a3b8' }}>Unable to calculate nutrition plan</p>
      </div>
    );
  }

  const targetCalories = plan.targetCalories;
  const targetProtein = plan.macroGrams.protein;
  const targetCarbs = plan.macroGrams.carbs;
  const targetFat = plan.macroGrams.fat;

  // Calculate percentages
  const caloriePercent = Math.round((todayIntake.calories / targetCalories) * 100);
  const proteinPercent = Math.round((todayIntake.protein / targetProtein) * 100);
  const carbsPercent = Math.round((todayIntake.carbs / targetCarbs) * 100);
  const fatPercent = Math.round((todayIntake.fat / targetFat) * 100);

  const getProgressColor = (percent: number) => {
    if (percent < 70) return '#ef4444'; // red
    if (percent < 90) return '#f59e0b'; // yellow
    if (percent <= 110) return '#10b981'; // green
    return '#f59e0b'; // yellow (over)
  };

  // Water progress
  const waterTargetMl = waterGoalMl || 2000;
  const waterPercent = Math.round((waterMlToday / waterTargetMl) * 100);

  const ProgressBar: React.FC<{ percent: number; label: string; current: number; target: number; unit: string }> = 
    ({ percent, label, current, target, unit }) => (
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
          <span style={{ fontWeight: 500 }}>{label}</span>
          <span style={{ color: '#94a3b8' }}>{current} / {target} {unit}</span>
        </div>
        <div style={{ 
          width: '100%', 
          height: '8px', 
          background: 'rgba(255, 255, 255, 0.1)', 
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${Math.min(percent, 100)}%`, 
            height: '100%', 
            background: getProgressColor(percent),
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ 
          marginTop: '0.25rem', 
          fontSize: '0.75rem', 
          color: getProgressColor(percent),
          fontWeight: 500
        }}>
          {percent}% of daily goal
        </div>
      </div>
    );

  return (
    <div className="nutrition-summary-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Today's Nutrition Summary</h3>
        <div style={{ 
          padding: '0.25rem 0.75rem', 
          background: caloriePercent >= 90 && caloriePercent <= 110 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: caloriePercent >= 90 && caloriePercent <= 110 ? '#10b981' : '#f97316'
        }}>
          {caloriePercent >= 90 && caloriePercent <= 110 ? '✓ On Track' : caloriePercent < 90 ? 'Under Goal' : 'Over Goal'}
        </div>
      </div>

      <ProgressBar 
        percent={caloriePercent}
        label="Calories"
        current={todayIntake.calories}
        target={Math.round(targetCalories)}
        unit="cal"
      />

      <ProgressBar 
        percent={proteinPercent}
        label="Protein"
        current={todayIntake.protein}
        target={Math.round(targetProtein)}
        unit="g"
      />

      <ProgressBar 
        percent={carbsPercent}
        label="Carbs"
        current={todayIntake.carbs}
        target={Math.round(targetCarbs)}
        unit="g"
      />

      <ProgressBar 
        percent={fatPercent}
        label="Fat"
        current={todayIntake.fat}
        target={Math.round(targetFat)}
        unit="g"
      />

      <div style={{ marginTop: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Hydration</h4>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 72 }}>
            <div style={{ height: 120, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${Math.min(100, Math.max(0, waterPercent))}%`, background: 'linear-gradient(180deg,#60a5fa,#3b82f6)', borderRadius: 6, transition: 'height 300ms ease' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, border: '2px solid rgba(255,255,255,0.06)', borderRadius: 8 }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 600 }}>{Math.round(mlToOz(waterMlToday))} oz</div>
              <div style={{ color: '#94a3b8' }}>{Math.round(waterPercent)}% of {Math.round(mlToOz(waterTargetMl))} oz</div>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(0, waterPercent))}%`, height: '100%', background: getProgressColor(waterPercent), transition: 'width 300ms ease' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '1.5rem', 
        padding: '1rem', 
        background: 'rgba(99, 102, 241, 0.1)',
        borderRadius: '8px',
        fontSize: '0.875rem',
        lineHeight: 1.6
      }}>
        <strong>Summary:</strong> You've consumed {caloriePercent}% of your daily calorie goal
        {caloriePercent < 70 && '. Consider eating more to meet your nutritional needs.'}
        {caloriePercent >= 70 && caloriePercent < 90 && '. You\'re making good progress!'}
        {caloriePercent >= 90 && caloriePercent <= 110 && '. Great job staying on target! 🎯'}
        {caloriePercent > 110 && '. You\'ve exceeded your goal for today.'}
      </div>
    </div>
  );
};

export default NutritionSummary;
