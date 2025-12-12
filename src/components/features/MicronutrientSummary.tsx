import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../lib/resolveFirebase';
import type { Meal } from '../../types/meal';
import { calculateActualMicros } from '../../utils/mealCalculations';

type MicronutrientKey = 'sodium' | 'sugars' | 'calcium' | 'iron';

interface MicronutrientTarget {
  label: string;
  unit: string;
  target: number;
  type: 'upper' | 'goal';
  description?: string;
}

const MICRONUTRIENT_TARGETS: Record<MicronutrientKey, MicronutrientTarget> = {
  // baselines keep UI simple without requiring user input
  sodium: { label: 'Sodium', unit: 'mg', target: 2300, type: 'upper', description: 'Stay under 2300mg/day' },
  sugars: { label: 'Sugars', unit: 'g', target: 50, type: 'upper', description: 'WHO upper limit ~50g/day' },
  calcium: { label: 'Calcium', unit: 'mg', target: 1000, type: 'goal', description: 'Common RDA for adults' },
  iron: { label: 'Iron', unit: 'mg', target: 18, type: 'goal', description: 'Typical RDA for adults' },
};

const MicronutrientSummary: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // keep a simple record keyed by nutrient for easy reduces
  const [microsToday, setMicrosToday] = useState<Record<MicronutrientKey, number>>({
    sodium: 0,
    sugars: 0,
    calcium: 0,
    iron: 0,
  });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveFirebase();
        // listen to auth so we only query meals for the signed-in user
        unsub = firebaseAuth.onAuthStateChanged(auth, (u: User | null) => setUser(u));
      } catch (err) {
        console.error('Micronutrient auth listener failed', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  useEffect(() => {
    if (!user) {
      setMicrosToday({ sodium: 0, sugars: 0, calcium: 0, iron: 0 });
      setLoading(false);
      return;
    }

    let unsubLocal: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const mealsQ = firestore.query(firestore.collection(db, 'meals'), firestore.where('userId', '==', user.uid));
        // live snapshot of today's meals to keep dashboard reactive
        unsubLocal = firestore.onSnapshot(mealsQ, (snap) => {
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

          const toMillis = (val: any): number => {
            if (typeof val === 'number') return val;
            if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
            if (val instanceof Date) return val.getTime();
            return 0;
          };

          const totals: Record<MicronutrientKey, number> = { sodium: 0, sugars: 0, calcium: 0, iron: 0 };

          snap.forEach((docSnap: any) => {
            const meal = docSnap.data() as Meal;
            const ms = toMillis(meal.createdAt);
            if (ms >= startOfToday && ms < endOfToday) {
              const micros = calculateActualMicros(meal);
              // accumulate actual micronutrient totals for the day
              totals.sodium += micros.sodium || 0;
              totals.sugars += micros.sugars || 0;
              totals.calcium += micros.calcium || 0;
              totals.iron += micros.iron || 0;
            }
          });

          setMicrosToday({
            sodium: Math.round(totals.sodium * 10) / 10,
            sugars: Math.round(totals.sugars * 10) / 10,
            calcium: Math.round(totals.calcium * 10) / 10,
            iron: Math.round(totals.iron * 10) / 10,
          });
          setLoading(false);
        });
      } catch (err) {
        console.error('Micronutrient meals snapshot failed', err);
        setLoading(false);
      }
    })();

    return () => { if (unsubLocal) unsubLocal(); };
  }, [user]);

  const toPercent = (value: number, target: number, isUpper: boolean) => {
    if (!target) return 0;
    const raw = (value / target) * 100;
    // cap upper-bound metrics to avoid runaway bars
    return isUpper ? Math.min(Math.round(raw), 150) : Math.round(raw);
  };

  const getColor = (percent: number, type: 'upper' | 'goal') => {
    // color coding: green when on track, red when over upper bounds
    if (type === 'upper') {
      if (percent <= 70) return '#10b981';
      if (percent <= 100) return '#f59e0b';
      return '#ef4444';
    }
    // goal style
    if (percent < 70) return '#f59e0b';
    if (percent <= 110) return '#10b981';
    return '#f59e0b';
  };

  const micronutrientRows = useMemo(() => {
    // build a normalized array for rendering tiles
    return (Object.keys(MICRONUTRIENT_TARGETS) as MicronutrientKey[]).map((key) => {
      const target = MICRONUTRIENT_TARGETS[key];
      const current = microsToday[key];
      const percent = toPercent(current, target.target, target.type === 'upper');
      return { key, ...target, current, percent, color: getColor(percent, target.type) };
    });
  }, [microsToday]);

  if (loading) {
    return (
      <div className="micronutrient-card">
        <div className="micronutrient-card__header">
          <div>
            <h3>Micronutrient Snapshot</h3>
            <p className="micronutrient-card__subtitle">Today&apos;s intake</p>
          </div>
          <span className="micronutrient-card__badge">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="micronutrient-card">
        <div className="micronutrient-card__header">
          <div>
            <h3>Micronutrient Snapshot</h3>
            <p className="micronutrient-card__subtitle">Sign in to view intake</p>
          </div>
        </div>
        <p style={{ color: '#94a3b8' }}>Please sign in to see today&apos;s micronutrients.</p>
      </div>
    );
  }

  return (
    <div className="card micronutrient-card">
      <div className="micronutrient-card__header">
        <div>
          <h3>Micronutrient Snapshot</h3>
          <p className="micronutrient-card__subtitle">Based on today&apos;s logged meals</p>
        </div>
        <span className="micronutrient-card__badge">Daily</span>
      </div>

      <div className="micronutrient-grid">
        {micronutrientRows.map(({ key, label, unit, target, current, percent, description, color }) => (
          <div key={key} className="micronutrient-tile">
            <div className="micronutrient-tile__top">
              <div>
                <div className="micronutrient-label">{label}</div>
                <div className="micronutrient-amount">{current}{unit}</div>
              </div>
              <div className="micronutrient-percent" style={{ color }}>{percent}%</div>
            </div>
            <div className="micronutrient-progress-track">
              <div
                className="micronutrient-progress"
                style={{ width: `${Math.min(percent, 150)}%`, background: color }}
              />
            </div>
            <div className="micronutrient-meta">
              <span className="micronutrient-target">Ref: {target}{unit}</span>
              {description && <span className="micronutrient-hint">{description}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MicronutrientSummary;

