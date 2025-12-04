import React, { useState, useEffect } from "react";
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
  const [weight, setWeight] = useState<string>(""); // weight in lbs

  const [busy, setBusy] = useState(false);
  const [targetLbs, setTargetLbs] = useState<number | null>(null);

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
    const lbs = parseFloat(weight);
    if (isNaN(lbs) || lbs <= 0) return alert("Enter a valid weight in lbs");
    setBusy(true);
    try {
      await add({ date: formatDateInput(date), weightLb: lbs });
      setWeight("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="weight-tracker">
      <h3>Weight Tracker</h3>
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
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          style={{ width: 120 }}
        />
        {/* Note removed: only date and weight are required */}
        <button onClick={onAdd}>Add</button>
      </div>

      <div>
        {loading ? (
          <div>Loading...</div>
        ) : entries.length === 0 ? (
          <div>No entries yet</div>
        ) : (
          <>
            <WeightChart entries={entries} width={600} height={160} />
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Date</th>
                <th style={{ textAlign: "left" }}>Weight (kg)</th>
                <th style={{ textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: WeightEntry) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.weightKg.toFixed(1)}</td>
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
