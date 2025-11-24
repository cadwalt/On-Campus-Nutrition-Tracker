import React, { useEffect, useMemo, useState } from 'react';
// Load Firebase lazily to avoid bundling SDK into initial chunk
const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firestore };
};
import type { WaterLog } from '../../types/water';
import { mlToOz, ozToMl } from '../../types/water';

const WaterTracker: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [logs, setLogs] = useState<WaterLog[] | null>(null);
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

  const addWater = async (amountMl: number, source: 'quick' | 'custom') => {
    if (!user) return;
    if (amountMl <= 0 || !Number.isFinite(amountMl)) return;
    setLoading(true);
    try {
      const log: Omit<WaterLog, 'id'> = {
        userId: user.uid,
        amountMl: Math.round(amountMl),
        createdAt: Date.now(),
        source,
      };
      const { dbClient, firestore } = await resolveFirebase();
      await firestore.addDoc(firestore.collection(dbClient, 'water'), log);
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

  return (
    <div className="card">
      <div className="section-header-with-tooltip">
        <h2>Water Intake</h2>
      </div>
      <div className="water-tracker">
        <div className="water-summary">
          <div className="water-amount">{totalOzToday} oz</div>
          <div className="water-label">Today</div>
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
