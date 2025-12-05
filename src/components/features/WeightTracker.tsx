import React, { useState, useEffect, useRef } from "react";
import { useWeightEntries } from "../../hooks/useWeightEntries";
import type { WeightEntry } from "../../types/weight";
import WeightChart from './WeightChart';
import { resolveFirebase } from '../../lib/resolveFirebase';
import { useNavigate } from 'react-router-dom';

function formatDateInput(d: string) {
  // ensure YYYY-MM-DD
  return d;
}

export const WeightTracker: React.FC = () => {
  const navigate = useNavigate();
  const { entries, loading, add, remove, update } = useWeightEntries();
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState<string>(""); // weight value entered by user
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [targetLbs, setTargetLbs] = useState<number | null>(null);
  const [range, setRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [editWeight, setEditWeight] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [showCongrats, setShowCongrats] = useState(false);

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
    // Prevent future dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (date > todayStr) {
      setError('Cannot enter weight for a future date');
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
    const formattedDate = formatDateInput(date);
    
    setBusy(true);
    try {
      // Check if an entry already exists for this date
      const existingEntry = entries.find((e) => e.date === formattedDate);
      
      if (existingEntry) {
        // Update existing entry
        await update(existingEntry.id, { weightLb: lbs });
        setToast('Weight Updated');
      } else {
        // Add new entry
        await add({ date: formattedDate, weightLb: lbs });
        setToast('Weight Saved');
      }
      
      setWeight("");
      setError(null);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
      
      // Check if goal was just reached
      if (targetLbs !== null) {
        // Determine weight direction by comparing against the oldest entry (first in sorted list)
        // For the first entry, infer direction from target: if new weight > target, user is trying to lose weight
        const firstEntryWeight = entries.length > 0 ? entries[0].weightLb : lbs;
        const isWeightLoss = entries.length > 0 
          ? lbs < firstEntryWeight 
          : lbs > targetLbs; // First entry: above target = weight loss goal
        const goalReached = Math.abs(targetLbs - lbs) < 0.1 || (isWeightLoss ? lbs <= targetLbs : lbs >= targetLbs);
        if (goalReached) {
          // Only show congrats if this entry is the most recent
          const allDates = [...entries.map(e => e.date), formattedDate];
          const latestDate = allDates.reduce((a, b) => a > b ? a : b);
          if (formattedDate === latestDate) {
            setTimeout(() => setShowCongrats(true), 500);
          }
        }
      }
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
  
  // For week/month views: use the selected date from the input box as the reference point
  // For year/all views: use the current date as the reference point
  // Parse the date string as local time (YYYY-MM-DD format) to avoid UTC timezone issues
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  
  const referenceDate = (range === 'week' || range === 'month') ? parseLocalDate(date) : new Date();
  
  let start = new Date();
  let end = new Date(referenceDate);
  
  if (range === 'week') {
    // Get Sunday of the week containing the selected date
    start = new Date(referenceDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day); // Sunday is day 0
    // Get Saturday of the same week
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  } else if (range === 'month') {
    start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  } else if (range === 'year') {
    start = new Date(referenceDate);
    start.setFullYear(referenceDate.getFullYear() - 1);
  }
  
  const filteredEntries = range === 'all' 
    ? allSorted 
    : allSorted.filter((e) => {
        // Normalize comparison: compare date strings directly (YYYY-MM-DD format)
        // to avoid timezone issues
        if (range === 'week' || range === 'month') {
          const startStr = start.toISOString().split('T')[0];
          const endStr = end.toISOString().split('T')[0];
          return e.date >= startStr && e.date <= endStr;
        }
        // For year/other views, use the start comparison
        const startStr = start.toISOString().split('T')[0];
        return e.date >= startStr;
      });

  // For chart: aggregate entries by month for year view and by year for all-time view
  const chartEntries = (() => {
    if (range === 'year') {
      // Aggregate by month for year view
      const byMonth = new Map<string, number[]>();
      filteredEntries.forEach((e) => {
        const d = new Date(e.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
        byMonth.get(monthKey)!.push(e.weightLb);
      });
      return Array.from(byMonth.entries()).map(([monthKey, weights]) => {
        const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
        const [year, month] = monthKey.split('-');
        const firstDayOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString().split('T')[0];
        return { id: monthKey, date: firstDayOfMonth, weightLb: avg };
      });
    } else if (range === 'all') {
      // Aggregate by year for all-time view
      const byYear = new Map<string, number[]>();
      filteredEntries.forEach((e) => {
        const d = new Date(e.date);
        const year = d.getFullYear().toString();
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year)!.push(e.weightLb);
      });
      return Array.from(byYear.entries()).map(([year, weights]) => {
        const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
        const firstDayOfYear = new Date(parseInt(year), 0, 1).toISOString().split('T')[0];
        return { id: year, date: firstDayOfYear, weightLb: avg };
      });
    }
    return filteredEntries;
  })();

  // For year view: aggregate by month; for all-time view: aggregate by year
  type TableRow = {
    label: string; // month/year label for aggregated views, or empty for detail views
    date: string; // original date for detail views, ISO month/year for aggregated
    weightLb: number;
    isAggregated: boolean; // true if this is a monthly/yearly average
  };

  const tableRows: TableRow[] = (() => {
    if (range === 'year') {
      // Group by month-year, compute average for each month
      const byMonth = new Map<string, number[]>();
      filteredEntries.forEach((e) => {
        const d = new Date(e.date);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
        byMonth.get(monthKey)!.push(e.weightLb);
      });
      // Sort by month and create rows
      return Array.from(byMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([monthKey, weights]) => {
          const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
          const [year, month] = monthKey.split('-');
          const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long' });
          return {
            label: monthName,
            date: monthKey,
            weightLb: avg,
            isAggregated: true,
          };
        });
    } else if (range === 'all') {
      // Group by year, compute average for each year
      const byYear = new Map<string, number[]>();
      filteredEntries.forEach((e) => {
        const d = new Date(e.date);
        const year = d.getFullYear().toString();
        if (!byYear.has(year)) byYear.set(year, []);
        byYear.get(year)!.push(e.weightLb);
      });
      // Sort by year and create rows
      return Array.from(byYear.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([year, weights]) => {
          const avg = Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) / 10;
          return {
            label: year,
            date: year,
            weightLb: avg,
            isAggregated: true,
          };
        });
    } else {
      // Detail view: week and month show individual entries
      return filteredEntries.map((e) => ({
        label: '',
        date: e.date,
        weightLb: e.weightLb,
        isAggregated: false,
      }));
    }
  })();

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
      
      // Goal is reached if current weight equals target OR has passed it
      // For weight loss: latestLbs <= targetLbs (weight is at or below target)
      // For weight gain: latestLbs >= targetLbs (weight is at or above target)
      // We determine direction by checking all entries: if latest is below first entry, it's weight loss
      const isWeightLoss = entries.length > 0 && latestLbs < entries[0].weightLb;
      const goalReached = Math.abs(diff) < 0.1 || (isWeightLoss ? latestLbs <= targetLbs : latestLbs >= targetLbs);
      
      if (goalReached) {
        return <span style={{ color: '#22c55e', fontWeight: 700 }}>Great Job! Target Reached!</span>;
      }
      
      if (diff > 0) return `${Math.abs(diffDisplay)} ${unitLabel} to reach target`;
      return `${Math.abs(diffDisplay)} ${unitLabel} to lose to reach target`;
    }
    const targetDisplay = unit === 'kg' ? Math.round((targetLbs / 2.20462) * 10) / 10 : targetLbs;
    const unitLabel = unit === 'kg' ? 'kg' : 'lbs';
    return `No weight entries yet — add your first entry to see progress toward ${targetDisplay} ${unitLabel}.`;
  })();

  const handleEditEntry = (entry: WeightEntry) => {
    setEditingEntry(entry);
    setEditWeight(entry.weightLb.toString());
    setEditDate(entry.date);
  };

  // Standardized weight validation helper
  function validateWeightInput(value: string, unit: string): string | null {
    const val = parseFloat(value);
    if (isNaN(val)) {
      return 'Enter a valid weight';
    }
    const minAllowed = 1;
    const maxAllowed = unit === 'kg' ? 700 : 1500;
    if (val < minAllowed || val > maxAllowed) {
      return `Enter a weight between ${minAllowed} and ${maxAllowed} ${unit}`;
    }
    return null;
  }

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const validationError = validateWeightInput(editWeight, unit);
    if (validationError) {
      setError(validationError);
      return;
    }
    const val = parseFloat(editWeight);
    // Prevent future dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (editDate > todayStr) {
      setError('Cannot update weight for a future date');
      return;
    }
    const lbsRaw = unit === 'kg' ? val * 2.20462 : val;
    const lbs = Math.round(lbsRaw * 10) / 10;
    setBusy(true);
    try {
      await remove(editingEntry.id);
      await add({ date: editDate, weightLb: lbs });
      setEditingEntry(null);
      setEditWeight('');
      setEditDate('');
      setError(null);
      setToast('Weight updated');
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
      // Check if goal was just reached and this is the most recent entry
      if (targetLbs !== null) {
        // Exclude the entry being edited to get the correct oldest entry reference
        const otherEntries = entries.filter(e => e.id !== editingEntry.id);
        // Determine weight direction by comparing against the oldest entry (first in sorted list)
        // For the first entry, infer direction from target: if new weight > target, user is trying to lose weight
        const firstEntryWeight = otherEntries.length > 0 ? otherEntries[0].weightLb : lbs;
        const isWeightLoss = otherEntries.length > 0 
          ? lbs < firstEntryWeight 
          : lbs > targetLbs; // First entry: above target = weight loss goal
        const goalReached = Math.abs(targetLbs - lbs) < 0.1 || (isWeightLoss ? lbs <= targetLbs : lbs >= targetLbs);
        const allDates = [...otherEntries.map(e => e.date), editDate];
        const latestDate = allDates.reduce((a, b) => a > b ? a : b);
        if (goalReached && editDate === latestDate) {
          setTimeout(() => setShowCongrats(true), 500);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditWeight('');
    setEditDate('');
    setError(null);
  };

  const handleDeleteEdit = async () => {
    if (!editingEntry) return;
    setBusy(true);
    try {
      await remove(editingEntry.id);
      handleCancelEdit();
      setToast('Weight Deleted');
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page weight-tracker-page">
      <main className="dashboard-content">
        {/* Toast notification */}
        {toast ? (
          <div role="status" aria-live="polite" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999 }}>
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
              <div style={{ color: 'inherit', fontSize: '3rem', textAlign: 'left', minWidth: 0, marginLeft: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span>{averageWeightDisplay}</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 500, color: '#9ca3af' }}>{unit} (avg)</span>
              </div>
              <div style={{ color: 'inherit', fontSize: '1.5rem', textAlign: 'right', minWidth: 0, marginRight: '0.5rem', marginBottom: '-1.5rem', fontWeight: 700 }}>
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
                            color: range === t.key ? '#fff' : '#9ca3af',
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
                  <WeightChart entries={chartEntries} height={220} range={range} unit={unit} targetWeight={targetLbs} />
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
                    <button className="water-add-btn-primary" onClick={onAdd} disabled={busy || date > new Date().toISOString().split('T')[0]}>Add</button>
                  </div>

                  <div style={{ flex: '1 1 auto', textAlign: 'right', color: '#9ca3af', fontSize: '0.85rem', marginBottom: '-0.5rem'}}>
                    ~Enter new weight or use dropdown and date to adjust units and time period displayed~
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
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", paddingBottom: 8, width: '50%' }}>
                          {range === 'year' ? 'Month' : range === 'all' ? 'Year' : range === 'month' ? (() => { const d = new Date(date + 'T00:00:00'); return d.toLocaleString('default', { month: 'long', year: 'numeric' }); })() : range === 'week' ? (() => { const startMonth = start.toLocaleString('default', { month: 'short' }); const startDay = start.getDate(); const endMonth = end.toLocaleString('default', { month: 'short' }); const endDay = end.getDate(); const year = end.getFullYear(); return startMonth === endMonth ? `${startMonth} ${startDay} - ${endDay}, ${year}` : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`; })() : 'Date'}
                        </th>
                        <th style={{ textAlign: "left", paddingBottom: 8, width: '50%' }}>
                          Weight ({unit}){range === 'year' || range === 'all' ? ' (avg)' : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, idx) => {
                        const displayWeight = unit === 'kg' ? Math.round((row.weightLb / 2.20462) * 10) / 10 : row.weightLb;
                        const isClickable = !row.isAggregated;
                        const entry = filteredEntries.find((e) => e.date === row.date && e.weightLb === row.weightLb);
                        return (
                          <tr
                            key={idx}
                            onClick={() => isClickable && entry && handleEditEntry(entry)}
                            style={{
                              borderTop: '1px solid rgba(255,255,255,0.1)',
                              cursor: isClickable ? 'pointer' : 'default',
                              transition: 'background-color 0.2s',
                              opacity: row.isAggregated ? 0.7 : 1,
                            }}
                            onMouseEnter={(ev) => isClickable && (ev.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <td style={{ paddingTop: 8, paddingBottom: 8, width: '50%' }}>{row.label || (() => { const d = new Date(row.date + 'T00:00:00'); return d.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' }); })()}</td>
                            <td style={{ paddingTop: 8, paddingBottom: 8, width: '50%' }}>{displayWeight.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Edit Modal */}
              {editingEntry && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }}>
                  <div style={{
                    backgroundColor: 'rgba(26, 26, 46, 0.95)',
                    borderRadius: 16,
                    padding: '2rem',
                    width: '90%',
                    maxWidth: 400,
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                  }}>
                    <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Edit Weight Entry</h2>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Weight ({unit})</label>
                      <input
                        type="number"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        step={0.1}
                        min={1}
                        max={unit === 'kg' ? 700 : 1500}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.2)',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          color: '#fff',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>Date</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.2)',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          color: '#fff',
                          fontSize: '1rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {error && <div style={{ color: 'crimson', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={handleSaveEdit}
                        disabled={busy}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          borderRadius: 8,
                          border: 'none',
                          backgroundColor: '#3b82f6',
                          color: '#fff',
                          cursor: busy ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleDeleteEdit}
                        disabled={busy}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          borderRadius: 8,
                          border: 'none',
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          cursor: busy ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={busy}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.2)',
                          backgroundColor: 'transparent',
                          color: '#fff',
                          cursor: busy ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
                          fontWeight: 600,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Congratulations Modal */}
        {showCongrats && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}>
            {/* Confetti effect */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              overflow: 'hidden',
            }}>
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: '10px',
                    height: '10px',
                    backgroundColor: ['#3b82f6', '#60a5fa', '#22c55e', '#fbbf24', '#f97316'][i % 5],
                    borderRadius: '50%',
                    animation: `fall ${2 + Math.random() * 1}s linear forwards`,
                    left: `${Math.random() * 100}%`,
                    top: '-10px',
                  }}
                />
              ))}
              <style>{`
                @keyframes fall {
                  to {
                    transform: translateY(100vh) rotate(360deg);
                    opacity: 0;
                  }
                }
              `}</style>
            </div>

            {/* Modal Content */}
            <div style={{
              backgroundColor: 'rgba(26, 26, 46, 0.95)',
              borderRadius: 16,
              padding: '3rem 2rem',
              width: '90%',
              maxWidth: 500,
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
              textAlign: 'center',
              position: 'relative',
              zIndex: 10001,
            }}>
              <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#22c55e' }}>🎉 Congratulations! 🎉</h1>
              <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#e5e7eb' }}>
                You've reached your weight goal! Fantastic job on your dedication and hard work.
              </p>
              <p style={{ fontSize: '1rem', marginBottom: '2rem', color: '#9ca3af' }}>
                Would you like to set a new goal and continue your wellness journey?
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowCongrats(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.2)',
                    backgroundColor: 'transparent',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowCongrats(false);
                    navigate('/preferences', { state: { openNutritionGoals: true } });
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                  }}
                >
                  Update Goal
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default WeightTracker;
