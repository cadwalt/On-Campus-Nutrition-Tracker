import React, { useEffect, useMemo, useState } from 'react';
// Load Firebase lazily to avoid bundling SDK into initial chunk
const resolveFirebase = async () => {
  const mod: any = await import('../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firestore };
};
import type { WaterLog, WaterBottle } from '../types/water';
import { mlToOz, ozToMl } from '../types/water';
import WaterSmartSuggestions from '../components/features/WaterSmartSuggestions';
import WaterIntakeTodayCard from '../components/features/WaterIntakeTodayCard';
import WaterAddCard from '../components/features/WaterAddCard';
import WaterMyBottlesCard from '../components/features/WaterMyBottlesCard';
import WaterBottleManagerCard from '../components/features/WaterBottleManagerCard';
import WaterEntriesCard from '../components/features/WaterEntriesCard';

const WaterIntakePage: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [logs, setLogs] = useState<WaterLog[] | null>(null);
  const [bottles, setBottles] = useState<WaterBottle[]>([]);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [unit, setUnit] = useState<'oz' | 'ml'>('oz');
  const [loading, setLoading] = useState(false);
  const [dailyGoalMl, setDailyGoalMl] = useState<number>(1892.7); // Default: 64 oz in ml

  // Load user and water logs
  useEffect(() => {
    (async () => {
      const { authClient, dbClient, firestore } = await resolveFirebase();
      const u = authClient.currentUser;
      setUser(u || null);
      if (!u) {
        setLogs([]);
        setBottles([]);
        return;
      }
      const q = firestore.query(firestore.collection(dbClient, 'water'), firestore.where('userId', '==', u.uid));
      const unsub = firestore.onSnapshot(q, (snap: any) => {
        const arr: WaterLog[] = [];
        snap.forEach((doc: any) => {
          const d = doc.data() as any;
          arr.push({ id: doc.id, ...(d as WaterLog) });
        });
        setLogs(arr);
      }, (err: any) => {
        console.error('Failed to load water logs', err);
        setLogs([]);
      });
      return () => unsub();
    })();
  }, []);

  // Load saved bottles and daily goal from user document (real-time listener)
  useEffect(() => {
    if (!user?.uid) {
      setBottles([]);
      setDailyGoalMl(1892.7);
      return;
    }

    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { dbClient, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(dbClient, 'users', user.uid);
        unsub = firestore.onSnapshot(userDocRef, (docSnap: any) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const savedBottles = data.water_bottles || [];
            // Sort by useCount descending, then by name
            const sorted = [...savedBottles].sort((a, b) => {
              const aCount = a.useCount || 0;
              const bCount = b.useCount || 0;
              if (bCount !== aCount) return bCount - aCount;
              return (a.name || '').localeCompare(b.name || '');
            });
            setBottles(sorted);
            
            // Load daily water goal (default to 64 oz / 1892.7 ml)
            const goal = data.water_goal_ml || 1892.7;
            setDailyGoalMl(goal);
          } else {
            // Document doesn't exist yet, use defaults
            setBottles([]);
            setDailyGoalMl(1892.7);
          }
        }, (err: any) => {
          console.error('Failed to load saved bottles and goal', err);
          setBottles([]);
          setDailyGoalMl(1892.7);
        });
      } catch (err) {
        console.error('Failed to subscribe to user document', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [user?.uid]);

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
    if (!logs) return 0;
    return logs.reduce((sum, l) => {
      const ms = toMillis((l as any).createdAt);
      if (ms >= todayRange.startMs && ms < todayRange.endMs) {
        return sum + (l.amountMl || 0);
      }
      return sum;
    }, 0);
  }, [logs, todayRange.startMs, todayRange.endMs]);

  const addWater = async (amountMl: number, source: 'quick' | 'custom' | 'bottle', bottleId?: string) => {
    if (!user) {
      alert('Please sign in to track water intake');
      return;
    }
    if (amountMl <= 0 || !Number.isFinite(amountMl)) {
      return;
    }
    setLoading(true);
    try {
      const log: Omit<WaterLog, 'id'> = {
        userId: user.uid,
        amountMl: Math.round(amountMl),
        createdAt: Date.now(),
        source,
        // Only include bottleId if it's provided (not undefined)
        ...(bottleId && { bottleId }),
      };
      const { dbClient, firestore } = await resolveFirebase();
      await firestore.addDoc(firestore.collection(dbClient, 'water'), log);
      setInputAmount('');

      // Update bottle use count if using a saved bottle
      if (bottleId && source === 'bottle') {
        await updateBottleUseCount(bottleId);
      }
    } catch (e) {
      console.error('Failed to add water log', e);
      alert('Failed to add water. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateBottleUseCount = async (bottleId: string) => {
    if (!user?.uid) return;
    try {
      const { dbClient, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(dbClient, 'users', user.uid);
      const userDocSnap = await firestore.getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const savedBottles: WaterBottle[] = data.water_bottles || [];
        const updatedBottles = savedBottles.map(bottle => 
          bottle.id === bottleId 
            ? { ...bottle, useCount: (bottle.useCount || 0) + 1 }
            : bottle
        );
        await firestore.updateDoc(userDocRef, {
          water_bottles: updatedBottles,
          updated_at: new Date()
        });
        // Update local state
        setBottles(updatedBottles.sort((a, b) => {
          const aCount = a.useCount || 0;
          const bCount = b.useCount || 0;
          if (bCount !== aCount) return bCount - aCount;
          return (a.name || '').localeCompare(b.name || '');
        }));
      }
    } catch (e) {
      console.error('Failed to update bottle use count', e);
    }
  };

  const handleQuickAdd = (oz: number) => {
    const amountMl = ozToMl(oz);
    void addWater(amountMl, 'quick');
  };

  const handleBottleAdd = (bottle: WaterBottle) => {
    void addWater(bottle.amountMl, 'bottle', bottle.id);
  };

  const handleCustomAdd = () => {
    const val = parseFloat(inputAmount);
    if (!val || val <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }
    const ml = unit === 'oz' ? ozToMl(val) : Math.round(val);
    void addWater(ml, 'custom');
  };

  // Calculate progress
  const progressPercentage = useMemo(() => {
    if (dailyGoalMl <= 0) return 0;
    return Math.min((totalMlToday / dailyGoalMl) * 100, 100);
  }, [totalMlToday, dailyGoalMl]);
  
  const remainingMl = Math.max(0, dailyGoalMl - totalMlToday);
  const remainingOz = mlToOz(remainingMl);
  const goalOz = mlToOz(dailyGoalMl);
  const goalMl = dailyGoalMl;

  return (
    <div className="page water-intake-page">
      <div className="page-header">
        <div className="page-header-title">
          <div>
            <h1>Water Intake</h1>
            <p>Track your daily water consumption and stay hydrated</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="water-unit-toggle-btn-header"
            onClick={() => setUnit(unit === 'oz' ? 'ml' : 'oz')}
            disabled={loading}
          >
            Switch to {unit === 'oz' ? 'ml' : 'oz'}
          </button>
        </div>
      </div>

      <main className="dashboard-content">
        <div className="water-intake-grid">
          {/* Left Column */}
          <div className="water-intake-column">
            <WaterIntakeTodayCard
              totalMlToday={totalMlToday}
              progressPercentage={progressPercentage}
              remainingMl={remainingMl}
              remainingOz={remainingOz}
              goalOz={goalOz}
              goalMl={goalMl}
              unit={unit}
              user={user}
              loading={loading}
              onGoalUpdate={setDailyGoalMl}
            />

            {/* Smart Suggestions Card */}
            <WaterSmartSuggestions
              logs={logs}
              totalMlToday={totalMlToday}
              progressPercentage={progressPercentage}
              remainingMl={remainingMl}
              remainingOz={remainingOz}
              unit={unit}
              todayRange={todayRange}
              user={user}
              loading={loading}
              onAddWater={(amountMl) => void addWater(amountMl, 'quick')}
            />

            {/* Today's Entries Card */}
            <WaterEntriesCard
              logs={logs}
              unit={unit}
              todayRange={todayRange}
              user={user}
              loading={loading}
              onEntriesUpdate={() => {
                // The logs are already updated via the onSnapshot listener,
                // but we can trigger a re-render if needed
                setLoading(false);
              }}
            />
          </div>

          {/* Right Column */}
          <div className="water-intake-column">
            <WaterMyBottlesCard
              bottles={bottles}
              unit={unit}
              user={user}
              loading={loading}
              onBottleAdd={handleBottleAdd}
            />

            <WaterAddCard
              inputAmount={inputAmount}
              unit={unit}
              user={user}
              loading={loading}
              onInputAmountChange={setInputAmount}
              onUnitChange={setUnit}
              onQuickAdd={handleQuickAdd}
              onCustomAdd={handleCustomAdd}
            />
            
            <WaterBottleManagerCard
              bottles={bottles}
              unit={unit}
              user={user}
              loading={loading}
              onBottlesUpdate={setBottles}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default WaterIntakePage;

