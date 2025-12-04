import React, { useState, useEffect, useRef } from "react";
import { useWeightEntries } from "../../hooks/useWeightEntries";
import type { WeightEntry } from "../../types/weight";
import WeightChart from './WeightChart';
import { resolveFirebase } from '../../lib/resolveFirebase';

function formatDateInput(d: string) {
  // ensure YYYY-MM-DD
  return d;
}

export const WeightTracker: React.FC = () => {
  const { entries, loading, add, remove } = useWeightEntries();
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState<string>(""); // weight value entered by user
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [targetLbs, setTargetLbs] = useState<number | null>(null);
  const [range, setRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { auth, firebaseAuth, db, firestore } = await resolveFirebase();
        const user = auth?.currentUser;
        if (!user) return;
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const snap = await firestore.getDoc(userDocRef);
        if (!mounted) return;
        if (snap.exists()) {
          const data = snap.data();
          const goals = data?.nutrition_goals;
          if (goals && typeof goals.target_weight === 'number') {
            setTargetLbs(goals.target_weight);
          }
        }
      } catch (err) {
        // non-fatal: leave target as null
        // console.error('Failed to load target weight', err);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const onAdd = async () => {
    const val = parseFloat(weight);
    if (isNaN(val)) {
      setError(unit === 'kg' ? 'Enter a valid weight in kg' : 'Enter a valid weight in lbs');
      return;
    }
    // enforce allowed input range in the entered unit
    const maxAllowed = unit === 'kg' ? 700 : 1500;
    if (val < 1 || val > maxAllowed) {
      setError(`Enter a weight between 1 and ${maxAllowed} ${unit === 'kg' ? 'kg' : 'lbs'}`);
      return;
    }
    // convert (if kg) and round to 1 decimal place
    const lbsRaw = unit === 'kg' ? val * 2.20462 : val;
    const lbs = Math.round(lbsRaw * 10) / 10;
    setBusy(true);
    try {
      await add({ date: formatDateInput(date), weightLb: lbs });
      setWeight("");
      setError(null);
      // show non-blocking confirmation toast
      setToast('Weight saved');
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  // Prepare sorted and filtered entries according to selected range
  const allSorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const now = new Date();
  let start = new Date();
  if (range === 'week') start.setDate(now.getDate() - 7);
  else if (range === 'month') start.setMonth(now.getMonth() - 1);
  else if (range === 'year') start.setFullYear(now.getFullYear() - 1);
  const filteredEntries = range === 'all' ? allSorted : allSorted.filter((e) => new Date(e.date) >= start);

  return (
    <div className="weight-tracker">
      {targetLbs ? (
        <div style={{ marginBottom: 8, color: '#555' }}>
          {entries && entries.length > 0 ? (
            (() => {
              const latest = entries[entries.length - 1];
              const latestLbs = latest ? latest.weightLb : null;
              if (latestLbs == null) return <span>Latest weight unavailable</span>;
              const diff = Math.round((targetLbs - latestLbs) * 10) / 10; // one decimal
              if (diff === 0) return <span>At goal ✅</span>;
              if (diff > 0) return <span>{Math.abs(diff)} lbs to reach target</span>;
              return <span>{Math.abs(diff)} lbs to lose to reach target</span>;
            })()
          ) : (
            <span>No weight entries yet — add your first entry to see progress toward {targetLbs} lbs.</span>
          )}
        </div>
      ) : null}
      <div
        className="water-custom-input-container"
        style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <div className="water-custom-input-wrapper" style={{ flex: '0 1 auto', minWidth: 0 }}>
          <input
            type="number"
            placeholder={unit === 'kg' ? "Weight (kg)" : "Weight (lbs)"}
            value={weight}
            onChange={(e) => { setWeight(e.target.value); if (error) setError(null); }}
            className="water-custom-input"
            step={0.1}
            min={1}
            max={unit === 'kg' ? 700 : 1500}
            aria-label="Weight value"
            style={{ minWidth: 180 }}
          />
          <select
            className="water-custom-unit"
            value={unit}
            onChange={(e) => { setUnit(e.target.value as 'lb' | 'kg'); if (error) setError(null); }}
            aria-label="Weight units"
            style={{ marginLeft: 8 }}
          >
            <option value="lb">lb</option>
            <option value="kg">kg</option>
          </select>
        </div>

        <div style={{ flex: '0 0 auto', minWidth: 160 }}>
          <div className="water-custom-input-wrapper" style={{ minWidth: 160 }}>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="water-custom-input"
              aria-label="Date"
              style={{ width: 160 }}
            />
          </div>
        </div>

        <div style={{ flex: '0 0 auto' }}>
          <button className="water-add-btn-primary" onClick={onAdd} disabled={busy}>Add</button>
        </div>
      </div>

      {/* conversion preview placed below the inputs */}
      {weight && !isNaN(Number(weight)) ? (
        <div style={{ fontSize: '0.9em', color: '#666', marginBottom: 8 }}>
          {unit === 'kg' ? (
            (() => {
              const val = parseFloat(weight);
              if (isNaN(val)) return null;
              const lb = Math.round(val * 2.20462 * 10) / 10;
              return `≈ ${lb} lb`;
            })()
          ) : (
            (() => {
              const val = parseFloat(weight);
              if (isNaN(val)) return null;
              const kg = Math.round((val / 2.20462) * 10) / 10;
              return `≈ ${kg} kg`;
            })()
          )}
        </div>
      ) : null}
      {error ? <div role="alert" style={{ color: 'crimson', marginTop: 6 }}>{error}</div> : null}
      {/* toast */}
      {toast ? (
        <div role="status" aria-live="polite" style={{ position: 'fixed', right: 16, bottom: 16 }}>
          <div style={{ background: '#1b5e20', color: '#fff', padding: '8px 12px', borderRadius: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>{toast}</div>
        </div>
      ) : null}

      <div>
        {loading ? (
          <div>Loading...</div>
        ) : entries.length === 0 ? (
          <div>No entries yet</div>
        ) : filteredEntries.length === 0 ? (
          <div>No entries in this range</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <label style={{ fontSize: '0.95rem', color: '#333' }}>View:</label>
              <select value={range} onChange={(e) => setRange(e.target.value as any)} style={{ padding: '6px 8px', borderRadius: 6 }}>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
                <option value="all">All time</option>
              </select>
            </div>

            <WeightChart entries={filteredEntries} width={600} height={160} />

            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Date</th>
                <th style={{ textAlign: "left" }}>Weight (lbs)</th>
                <th style={{ textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e: WeightEntry) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.weightLb.toFixed(1)}</td>
                  <td>
                    <button disabled={busy} onClick={async () => { setBusy(true); try { await remove(e.id); } finally { setBusy(false); } }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  );
};

export default WeightTracker;
