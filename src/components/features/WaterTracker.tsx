import React, { useEffect, useMemo, useState } from 'react';
import { resolveFirebase } from '../../lib/resolveFirebase';
import type { WaterLog } from '../../types/water';
import { mlToOz, ozToMl } from '../../types/water';

const WaterTracker: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [logs, setLogs] = useState<WaterLog[] | null>(null);
  const [dailyMap, setDailyMap] = useState<Record<string, number>>({});
  const [inputAmount, setInputAmount] = useState<string>('');
  const [unit, setUnit] = useState<'oz' | 'ml'>('oz');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { authClient, dbClient, firestore } = await resolveFirebase();
      const u = authClient.currentUser;
      setUser(u || null);
      if (!u) {
        setLogs([]);
        setDailyMap({});
        return;
      }
      const userDocRef = firestore.doc(dbClient, 'users', u.uid);
      const unsub = firestore.onSnapshot(userDocRef, (docSnap: any) => {
        if (!docSnap.exists()) {
          setDailyMap({});
          setLogs([]);
          return;
        }
        const data = docSnap.data() as any;
        const map = (data?.water?.daily) || {};
        setDailyMap(map);
        // preserve logs array for legacy display if needed
        setLogs([]);
      }, (err: any) => {
        console.error('Failed to load user water data', err);
        setDailyMap({});
        setLogs([]);
      });
      return () => unsub();
    })();
  }, []);

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
    const keyDate = new Date(todayRange.startMs).toISOString().slice(0,10);
    return Math.round((dailyMap[keyDate] || 0));
  }, [dailyMap, todayRange.startMs]);

  const addWater = async (amountMl: number, source: 'quick' | 'custom') => {
    if (!user) return;
    if (amountMl <= 0 || !Number.isFinite(amountMl)) return;
    setLoading(true);
    try {
      const amount = Math.round(amountMl);
      const { dbClient, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(dbClient, 'users', user.uid);
      const dateKey = new Date(todayRange.startMs).toISOString().slice(0,10); // YYYY-MM-DD
      // Try atomic increment; if the document doesn't exist, fall back to set with merge
      try {
        await firestore.updateDoc(userDocRef, {
          [`water.daily.${dateKey}`]: firestore.increment(amount),
          'water.lastUpdated': Date.now(),
          'water.lastSource': source,
        });
      } catch (err: any) {
        // If update failed (likely because doc missing), create with merge
        await firestore.setDoc(userDocRef, {
          water: { daily: { [dateKey]: amount }, lastUpdated: Date.now(), lastSource: source }
        }, { merge: true });
      }
      setInputAmount('');
    } catch (e) {
      console.error('Failed to add water log', e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = (oz: number) => addWater(ozToMl(oz), 'quick');

  const handleCustomAdd = () => {
    const val = parseFloat(inputAmount);
    if (!val || val <= 0) return;
    const ml = unit === 'oz' ? ozToMl(val) : Math.round(val);
    void addWater(ml, 'custom');
  };

  const totalOzToday = mlToOz(totalMlToday);

  // Visual goal in mL (default ~2000 mL). You can replace this with user goal from profile later.
  const DAILY_GOAL_ML = 2000;
  const percent = Math.min(100, Math.round((totalMlToday / DAILY_GOAL_ML) * 100));

  return (
    <div className="card">
      <div className="section-header-with-tooltip">
        <h2>Water Intake</h2>
      </div>
      <div className="water-tracker">
        <div className="water-visual-and-summary">
          <div className="water-glass-wrap" aria-hidden>
            <div className="water-glass">
              <div
                className="water-fill"
                style={{ height: `${percent}%` }}
              />
              <div className="water-glass-outline" />
            </div>
          </div>
          <div className="water-summary">
            <div className="water-amount">{totalOzToday} oz</div>
            <div className="water-label">Today • {percent}% of {mlToOz(DAILY_GOAL_ML)} oz</div>
          </div>
        </div>

        <div className="water-quick-buttons">
          <button className="water-btn" onClick={() => handleQuickAdd(8)} disabled={loading || !user}>+8 oz</button>
          <button className="water-btn" onClick={() => handleQuickAdd(12)} disabled={loading || !user}>+12 oz</button>
          <button className="water-btn" onClick={() => handleQuickAdd(16)} disabled={loading || !user}>+16 oz</button>
        </div>

        <div className="water-custom">
          <div className="water-input-wrap">
            <input
              type="number"
              min={1}
              step={1}
              className="water-input"
              placeholder={`Add amount in ${unit}`}
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCustomAdd();
                }
              }}
              disabled={loading || !user}
            />
            <select
              className="water-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'oz' | 'ml')}
              disabled={loading}
            >
              <option value="oz">oz</option>
              <option value="ml">ml</option>
            </select>
          </div>
          <button className="water-add" onClick={handleCustomAdd} disabled={loading || !inputAmount}>Add</button>
        </div>

        {!user && <div className="muted">Sign in to track water.</div>}
      </div>
    </div>
  );
};

export default WaterTracker;
