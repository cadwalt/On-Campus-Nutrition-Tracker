import React, { useState } from "react";
import { useWeightEntries } from "../../hooks/useWeightEntries";
import type { WeightEntry } from "../../types/weight";
import WeightChart from './WeightChart';

function formatDateInput(d: string) {
  // ensure YYYY-MM-DD
  return d;
}

export const WeightTracker: React.FC = () => {
  const { entries, loading, add, remove } = useWeightEntries();
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const onAdd = async () => {
    const kg = parseFloat(weight);
    if (isNaN(kg) || kg <= 0) return alert("Enter a valid weight in kg");
    setBusy(true);
    try {
      await add({ date: formatDateInput(date), weightKg: kg, note: note || undefined });
      setWeight("");
      setNote("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="weight-tracker">
      <h3>Weight Tracker</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          placeholder="Weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          style={{ width: 120 }}
        />
        <input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
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
                <th style={{ textAlign: "left" }}>Note</th>
                <th style={{ textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: WeightEntry) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.weightKg.toFixed(1)}</td>
                  <td>{e.note || ""}</td>
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
