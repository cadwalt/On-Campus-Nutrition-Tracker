import React, { useEffect, useState, useMemo, Suspense } from 'react';
import NutritionPlanCard from '../components/features/NutritionPlanCard';
import WelcomeHeader from '../components/ui/WelcomeHeader';

// Lazy-load heavier feature components so the dashboard splits into chunks
const NutritionSummary = React.lazy(() => import('../components/features/NutritionSummary'));
const WaterIntakeTodayCard = React.lazy(() => import('../components/features/WaterIntakeTodayCard'));
// load micronutrient snapshot separately to keep initial payload small
const MicronutrientSummary = React.lazy(() => import('../components/features/MicronutrientSummary'));
import { type User } from 'firebase/auth';
import { resolveFirebase } from '../lib/resolveFirebase';
import type { Meal } from '../types/meal';
import { calculateActualCalories } from '../utils/mealCalculations';
import type { WaterLog } from '../types/water';
import { mlToOz } from '../types/water';

const Dashboard: React.FC = () => {
  // Live Quick Stats derived from user's meals
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ totalMeals: 0, caloriesToday: 0, activeDays: 0 });
  
  // Water intake state
  const [waterLogs, setWaterLogs] = useState<WaterLog[] | null>(null);
  const [waterUnit, setWaterUnit] = useState<'oz' | 'ml'>('oz');
  const [waterLoading, setWaterLoading] = useState(false);
  const [dailyGoalMl, setDailyGoalMl] = useState<number>(1892.7); // Default: 64 oz in ml

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

  // Load water logs
  useEffect(() => {
    if (!user) {
      setWaterLogs([]);
      return;
    }
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const q = firestore.query(firestore.collection(db, 'water'), firestore.where('userId', '==', user.uid));
        unsub = firestore.onSnapshot(q, (snap: any) => {
          const arr: WaterLog[] = [];
          snap.forEach((doc: any) => {
            const d = doc.data() as any;
            arr.push({ id: doc.id, ...(d as WaterLog) });
          });
          setWaterLogs(arr);
        }, (err: any) => {
          console.error('Failed to load water logs', err);
          setWaterLogs([]);
        });
      } catch (err) {
        console.error('Failed to subscribe to water logs', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [user]);

  // Load daily water goal
  useEffect(() => {
    if (!user?.uid) {
      setDailyGoalMl(1892.7);
      return;
    }
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        unsub = firestore.onSnapshot(userDocRef, (docSnap: any) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const goal = data.water_goal_ml || 1892.7;
            setDailyGoalMl(goal);
          } else {
            setDailyGoalMl(1892.7);
          }
        }, (err: any) => {
          console.error('Failed to load water goal', err);
          setDailyGoalMl(1892.7);
        });
      } catch (err) {
        console.error('Failed to subscribe to user document', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [user?.uid]);

  // Calculate today's water intake
  const todayRange = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }, []);

  const toMillis = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
    if (val instanceof Date) return val.getTime();
    return 0;
  };

  const totalMlToday = useMemo(() => {
    if (!waterLogs) return 0;
    return waterLogs.reduce((sum, l) => {
      const ms = toMillis((l as any).createdAt);
      if (ms >= todayRange.startMs && ms < todayRange.endMs) {
        return sum + (l.amountMl || 0);
      }
      return sum;
    }, 0);
  }, [waterLogs, todayRange.startMs, todayRange.endMs]);

  const progressPercentage = useMemo(() => {
    if (dailyGoalMl <= 0) return 0;
    return Math.min((totalMlToday / dailyGoalMl) * 100, 100);
  }, [totalMlToday, dailyGoalMl]);

  const remainingMl = Math.max(0, dailyGoalMl - totalMlToday);
  const remainingOz = mlToOz(remainingMl);
  const goalOz = mlToOz(dailyGoalMl);
  const goalMl = dailyGoalMl;

  return (
    <div className="dashboard-page">
      <main className="dashboard-content">
        {/* Welcome Header */}
        <WelcomeHeader user={user} />
        
        <div className="dashboard-grid">
          <div className="dashboard-left">
            {/* Nutrition Summary - Shows intake vs goals */}
            <Suspense fallback={<div>Loading summary...</div>}>
              <NutritionSummary />
            </Suspense>

            {/* Micronutrient Snapshot */}
            {/* lives on dashboard left column near macros for quick reference */}
            <Suspense fallback={<div>Loading micronutrients...</div>}>
              <MicronutrientSummary />
            </Suspense>

            {/* Water Intake Tracker */}
            <Suspense fallback={<div>Loading water tracker...</div>}>
              <WaterIntakeTodayCard
                totalMlToday={totalMlToday}
                progressPercentage={progressPercentage}
                remainingMl={remainingMl}
                remainingOz={remainingOz}
                goalOz={goalOz}
                goalMl={goalMl}
                unit={waterUnit}
                user={user}
                loading={waterLoading}
                onGoalUpdate={setDailyGoalMl}
              />
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
