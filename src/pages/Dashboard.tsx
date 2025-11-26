import React, { useEffect, useState, Suspense } from 'react';
import NutritionPlanCard from '../components/features/NutritionPlanCard';

// Lazy-load heavier feature components so the dashboard splits into chunks
const RestaurantDisplay = React.lazy(() => import('../components/features/RestaurantDisplay'));
const NutritionSummary = React.lazy(() => import('../components/features/NutritionSummary'));
const WaterTracker = React.lazy(() => import('../components/features/WaterTracker'));
import { type User } from 'firebase/auth';
import { resolveFirebase } from '../lib/resolveFirebase';
import type { Meal } from '../types/meal';
import { calculateActualCalories } from '../utils/mealCalculations';

const Dashboard: React.FC = () => {
  // Live Quick Stats derived from user's meals
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ totalMeals: 0, caloriesToday: 0, activeDays: 0 });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveFirebase();
        unsub = firebaseAuth.onAuthStateChanged(auth, (u: User | null) => setUser(u));
      } catch (err) {
        console.error('Auth init failed', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    if (!user) {
      setStats({ totalMeals: 0, caloriesToday: 0, activeDays: 0 });
      return;
    }
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const mealsQ = firestore.query(firestore.collection(db, 'meals'), firestore.where('userId', '==', user.uid));
        unsub = firestore.onSnapshot(mealsQ, (snap) => {
      let totalMeals = 0;
      let caloriesToday = 0;
      const daysSet = new Set<string>();

      const toMillis = (val: any): number => {
        if (typeof val === 'number') return val;
        if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
        if (val instanceof Date) return val.getTime();
        return 0;
      };

      const startOfToday = (() => { const d = new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
      const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

      snap.forEach((docSnap) => {
        const data = docSnap.data() as Meal;
        totalMeals += 1;
        const ms = toMillis((data as any).createdAt);
        if (ms) {
          const dayKey = new Date(ms).toISOString().slice(0,10);
          daysSet.add(dayKey);
          if (ms >= startOfToday && ms < endOfToday) {
            const cal = calculateActualCalories(data);
            caloriesToday += cal;
          }
        }
      });

        setStats({ totalMeals, caloriesToday, activeDays: daysSet.size });
        });
      } catch (err) {
        console.error('Meals subscription failed', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [user]);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Nutrition Dashboard</h1>
        <p>Track your nutrition and get personalized recommendations</p>
      </div>

      <main className="dashboard-content">
        {/* Restaurant Display spans full width */}
        <Suspense fallback={<div>Loading restaurant...</div>}>
          <RestaurantDisplay />
        </Suspense>
        
        <div className="dashboard-grid">
          <div className="dashboard-left">
            {/* Nutrition Summary - Shows intake vs goals */}
            <Suspense fallback={<div>Loading summary...</div>}>
              <NutritionSummary />
            </Suspense>

            {/* Water Intake Tracker */}
            <Suspense fallback={<div>Loading water tracker...</div>}>
              <WaterTracker />
            </Suspense>
          </div>
          
          <div className="dashboard-right">
            <div className="card">
              <h2>Quick Stats</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">{stats.totalMeals}</div>
                  <div className="stat-label">Meals Tracked</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{stats.caloriesToday}</div>
                  <div className="stat-label">Calories Today</div>
                </div>
                {/* Water stat migrated into WaterTracker card */}
                <div className="stat-item">
                  <div className="stat-number">{stats.activeDays}</div>
                  <div className="stat-label">Active Days</div>
                </div>
              </div>
            </div>

            <NutritionPlanCard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
