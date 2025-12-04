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
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const { auth, firebaseAuth, db, firestore } = await resolveFirebase();
        // Wait for auth state to be ready before fetching target weight
        unsubscribe = firebaseAuth.onAuthStateChanged(auth, async (user) => {
          if (!mounted) return;
          if (!user) {
            setTargetLbs(null);
            return;
          }
          try {
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
        });
      } catch (err) {
        // non-fatal: leave target as null
        // console.error('Failed to setup auth listener', err);
      }
    })();
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
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

  // compute average weight for the currently selected period (filteredEntries)
  const averageWeightLb: number | null = filteredEntries.length === 0
    ? null
    : Math.round((filteredEntries.reduce((s, it) => s + it.weightLb, 0) / filteredEntries.length) * 10) / 10;

  // convert average to display unit
  const averageWeightDisplay = averageWeightLb != null
    ? (unit === 'kg' ? Math.round((averageWeightLb / 2.20462) * 10) / 10 : averageWeightLb)
    : null;

  const targetMessage = (() => {
    if (!targetLbs) return null;
    if (entries && entries.length > 0) {
      const latest = entries[entries.length - 1];
      const latestLbs = latest ? latest.weightLb : null;
      if (latestLbs == null) return 'Latest weight unavailable';
      const diff = Math.round((targetLbs - latestLbs) * 10) / 10; // one decimal
      // convert diff to display unit
      const diffDisplay = unit === 'kg' ? Math.round((diff / 2.20462) * 10) / 10 : diff;
      const unitLabel = unit === 'kg' ? 'kg' : 'lbs';
      if (diff === 0) return 'At goal ✅';
      if (diff > 0) return `${Math.abs(diffDisplay)} ${unitLabel} to reach target`;
      return `${Math.abs(diffDisplay)} ${unitLabel} to lose to reach target`;
    }
    const targetDisplay = unit === 'kg' ? Math.round((targetLbs / 2.20462) * 10) / 10 : targetLbs;
    const unitLabel = unit === 'kg' ? 'kg' : 'lbs';
    return `No weight entries yet — add your first entry to see progress toward ${targetDisplay} ${unitLabel}.`;
  })();

  return (
    <div className="page weight-tracker-page">
      <main className="dashboard-content">
        {/* Toast notification */}
        {toast ? (
          <div role="status" aria-live="polite" style={{ position: 'fixed', right: 16, bottom: 16 }}>
            <div style={{ background: '#1b5e20', color: '#fff', padding: '8px 12px', borderRadius: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>{toast}</div>
          </div>
        ) : null}

        <div className="weight-tracker-grid">
          {/* Header card - Average weight and target */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ color: 'inherit', fontSize: '1.5rem', textAlign: 'left', minWidth: 0, marginLeft: '0.5rem', fontWeight: 700 }}>
                {averageWeightDisplay} {unit} (avg)
              </div>
              <div style={{ color: 'inherit', fontSize: '1.5rem', textAlign: 'right', minWidth: 0, marginRight: '0.5rem', fontWeight: 700 }}>
                {targetMessage}
              </div>
            </header>
          </div>

          {/* Chart card */}
          {loading ? (
            <div className="card">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="card">No entries yet</div>
          ) : (
            <>
              <div className="card">
                {/* Range tabs */}
                {(() => {
                  const tabs: { key: typeof range; label: string }[] = [
                    { key: 'week', label: 'Week' },
                    { key: 'month', label: 'Month' },
                    { key: 'year', label: 'Year' },
                    { key: 'all', label: 'All time' },
                  ];
                  return (
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                      {tabs.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setRange(t.key)}
                          aria-pressed={range === t.key}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 10,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                            background: range === t.key ? 'linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)' : 'transparent',
                            color: range === t.key ? '#fff' : '#374151',
                            boxShadow: range === t.key ? '0 4px 12px rgba(59,130,246,0.2)' : 'none',
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Chart */}
                {filteredEntries.length === 0 ? (
                  <div>No entries in this range</div>
                ) : (
                  <WeightChart entries={filteredEntries} height={220} range={range} />
                )}
              </div>

              {/* Input card */}
              <div className="card">
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
                  <div style={{ fontSize: '0.9em', color: '#666', marginBottom: 8, marginTop: 4 }}>
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
              </div>

              {/* Data table card */}
              {filteredEntries.length > 0 && (
                <div className="card">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", paddingBottom: 8 }}>Date</th>
                        <th style={{ textAlign: "left", paddingBottom: 8 }}>Weight (lbs)</th>
                        <th style={{ textAlign: "left", paddingBottom: 8 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((e: WeightEntry) => (
                        <tr key={e.id} style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <td style={{ paddingTop: 8, paddingBottom: 8 }}>{e.date}</td>
                          <td style={{ paddingTop: 8, paddingBottom: 8 }}>{e.weightLb.toFixed(1)}</td>
                          <td style={{ paddingTop: 8, paddingBottom: 8 }}>
                            <button disabled={busy} onClick={async () => { setBusy(true); try { await remove(e.id); } finally { setBusy(false); } }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default WeightTracker;
