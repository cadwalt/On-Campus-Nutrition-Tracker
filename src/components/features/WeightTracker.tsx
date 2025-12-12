import React, { useState, useEffect, useRef } from "react";
import { useWeightEntries } from "../../hooks/useWeightEntries";
import type { WeightEntry } from "../../types/weight";
import { WeightChart } from './WeightChart.tsx';
import { resolveFirebase } from '../../lib/resolveFirebase';
import { useNavigate } from 'react-router-dom';

// Helper function to format date input
function formatDateInput(dateStr: string): string {
  return dateStr; // Date is already in YYYY-MM-DD format from the input
}

// Main Weight Tracker component
export const WeightTracker: React.FC = () => {
  const navigate = useNavigate(); // for navigation on goal achievement
  const { entries, loading, add, remove, update } = useWeightEntries(); // custom hook to manage weight entries
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10)); // default to today
  const [weight, setWeight] = useState<string>(""); // weight value entered by user
  const [unit, setUnit] = useState<'lb' | 'kg'>('lb'); // weight unit
  const [error, setError] = useState<string | null>(null); // error message for input validation
  const [toast, setToast] = useState<string | null>(null); // toast message for feedback
  const toastTimer = useRef<number | null>(null); // timer for toast auto-hide

  const [busy, setBusy] = useState(false); // busy state for async operations
  const [targetLbs, setTargetLbs] = useState<number | null>(null); // user's target weight in lbs
  const [primaryGoal, setPrimaryGoal] = useState<'lose_weight' | 'gain_weight' | null>(null); // user's primary goal
  const [range, setRange] = useState<'week' | 'month' | 'year' | 'all'>('month'); // selected range for display
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null); // entry being edited
  const [editWeight, setEditWeight] = useState<string>(''); // weight value in edit modal
  const [editDate, setEditDate] = useState<string>(''); // date value in edit modal
  const [showCongrats, setShowCongrats] = useState(false); // show congrats modal on goal achievement

  useEffect(() => {
    // Subscribe to auth changes so we can pull goal prefs (target weight + goal direction)
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    (async () => { // eslint-disable-line @typescript-eslint/no-misused-promises
      try { // get auth client
        const { auth, firebaseAuth, db, firestore } = await resolveFirebase();
        // Wait for auth state to be ready before fetching target weight
        unsubscribe = firebaseAuth.onAuthStateChanged(auth, async (user) => {
          // if component unmounted, abort
          if (!mounted) return;
          if (!user) { // no user logged in
            console.log('WeightTracker: No user logged in'); // reset target/goal
            setTargetLbs(null);
            setPrimaryGoal(null);
            return;
          }
          console.log('WeightTracker: User logged in:', user.uid); // fetch user prefs
          try {
            // Fetch the user's nutrition goals (target + primary goal) from Firestore
            const userDocRef = firestore.doc(db, 'users', user.uid);
            const snap = await firestore.getDoc(userDocRef);
            if (!mounted) return;
            console.log('WeightTracker: Document exists?', snap.exists());
            if (snap.exists()) {
              const data = snap.data();
              console.log('WeightTracker: Full document data:', data);
              const goals = data?.nutrition_goals;
              console.log('WeightTracker: Fetched nutrition_goals:', goals);
              if (goals && typeof goals.target_weight === 'number') {
                setTargetLbs(goals.target_weight);
                console.log('WeightTracker: Set targetLbs to', goals.target_weight);
              }
              if (goals && goals.primary_goal) {
                const goal = goals.primary_goal;
                console.log('WeightTracker: Found primary_goal:', goal);
                if (goal === 'lose_weight' || goal === 'gain_weight') {
                  setPrimaryGoal(goal);
                  console.log('WeightTracker: Set primaryGoal to', goal);
                }
              } else {
                console.log('WeightTracker: No primary_goal found in goals:', goals);
              }
            } else {
              console.log('WeightTracker: User document does not exist');
            }
          } catch (err) {
            console.error('Failed to load weight tracker preferences:', err);
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
    // Add/update a weight entry for the selected date (one per date)
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
      
      // Clear input fields and error if successful
      setWeight("");
      setError(null);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
      
      // Check if goal was just reached based on the current entry and user goal direction
      if (targetLbs !== null && primaryGoal !== null) {
        console.log('WeightTracker: Checking goal - targetLbs:', targetLbs, 'primaryGoal:', primaryGoal, 'lbs:', lbs);
        let goalReached = false;
        
        // Check if most recent entry meets the goal threshold
        if (primaryGoal === 'lose_weight') {
          goalReached = lbs <= targetLbs;
          console.log('WeightTracker: Weight loss goal check - lbs:', lbs, '<= targetLbs:', targetLbs, '? goalReached:', goalReached);
        } else if (primaryGoal === 'gain_weight') {
          goalReached = lbs >= targetLbs;
          console.log('WeightTracker: Weight gain goal check - lbs:', lbs, '>= targetLbs:', targetLbs, '? goalReached:', goalReached);
        }
        
        if (goalReached) {
          console.log('WeightTracker: Goal reached! Setting showCongrats to true');
          // Only show congrats if this entry is the most recent
          const allDates = [...entries.map(e => e.date), formattedDate];
          const latestDate = allDates.reduce((a, b) => a > b ? a : b);
          if (formattedDate === latestDate) {
            setTimeout(() => setShowCongrats(true), 500);
          }
        }
      } else { // log missing target/goal
        console.log('WeightTracker: Goal check skipped - targetLbs:', targetLbs, 'primaryGoal:', primaryGoal);
      }
    } finally {
      setBusy(false);
    }
  };

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  // Prepare sorted and filtered entries according to selected range
  const allSorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  
  // For week/month views: use the selected date from the input box as the reference point
  // For week/month/year views: use the selected date from the input box as the reference point
  // For all view: use the current date as the reference point
  // Parse the date string as local time (YYYY-MM-DD format) to avoid UTC timezone issues
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  
  // Determine the reference date based on range
  const referenceDate = (range === 'week' || range === 'month' || range === 'year') ? parseLocalDate(date) : new Date();
  
  // Determine start and end dates for filtering based on range
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
    // start and end of the month containing the selected date
    start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  } else if (range === 'year') {
    // start of the year containing the selected date
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
      // Only include entries from the selected year
      const selectedYear = new Date(date + 'T00:00:00').getFullYear();
      const byMonth = new Map<string, number[]>();
      filteredEntries.forEach((e) => {
        const d = new Date(e.date);
        if (d.getFullYear() !== selectedYear) return;
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
        byMonth.get(monthKey)!.push(e.weightLb);
      });
      // Compute average weight for each month
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
      // Compute average weight for each year
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

  // Prepare table rows based on selected range
  const tableRows: TableRow[] = (() => {
    if (range === 'year') {
      // Only include entries from the selected year
      const selectedYear = new Date(date + 'T00:00:00').getFullYear();
      const byMonth = new Map<string, number[]>();
      filteredEntries.forEach((e) => {
        const d = new Date(e.date);
        if (d.getFullYear() !== selectedYear) return;
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
        byMonth.get(monthKey)!.push(e.weightLb);
      });
      // Sort by month descending (most recent first)
      return Array.from(byMonth.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
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
      // Sort by year descending (most recent first)
      return Array.from(byYear.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
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
      // Detail view: week and month show individual entries (most recent first)
      return filteredEntries
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((e) => ({
          label: '',
          date: e.date,
          weightLb: e.weightLb,
          isAggregated: false,
        }));
    }
  })();

  // compute average weight for the currently selected period (filteredEntries)
  const averageWeightLb: number = filteredEntries.length === 0
    ? 0
    : Math.round((filteredEntries.reduce((s, it) => s + it.weightLb, 0) / filteredEntries.length) * 10) / 10;

  // convert average to display unit
  const averageWeightDisplay = averageWeightLb !== 0
    ? (unit === 'kg' ? Math.round((averageWeightLb / 2.20462) * 10) / 10 : averageWeightLb)
    : 0;

  const targetMessage = (() => {
    // Derive the header message showing distance to target (or success)
    if (!targetLbs) {
      return null;
    }
    if (entries && entries.length > 0) {
      const latest = entries[entries.length - 1];
      const latestLbs = latest ? latest.weightLb : null;
      if (latestLbs == null) return 'Latest weight unavailable';
      const diff = Math.round((targetLbs - latestLbs) * 10) / 10; // one decimal
      // convert diff to display unit
      const diffDisplay = unit === 'kg' ? Math.round((diff / 2.20462) * 10) / 10 : diff;
      const unitLabel = unit === 'kg' ? 'kg' : 'lbs';
      
      // Goal is reached if latest entry meets the threshold based on primaryGoal
      let goalReached = false;
      if (primaryGoal === 'lose_weight') {
        goalReached = latestLbs <= targetLbs;
      } else if (primaryGoal === 'gain_weight') {
        goalReached = latestLbs >= targetLbs;
      }
      
      if (goalReached) {
        return <span style={{ color: '#22c55e', fontWeight: 700 }}>Great Job! Target Reached!</span>;
      }
      
      // Show remaining distance based on goal direction
      if (primaryGoal === 'lose_weight') {
        return `${Math.abs(diffDisplay)} ${unitLabel} to lose to reach target`;
      } else if (primaryGoal === 'gain_weight') {
        return `${Math.abs(diffDisplay)} ${unitLabel} to gain to reach target`;
      }
      return `${Math.abs(diffDisplay)} ${unitLabel} to reach target`;
    }
    const targetDisplay = unit === 'kg' ? Math.round((targetLbs / 2.20462) * 10) / 10 : targetLbs;
    const unitLabel = unit === 'kg' ? 'kg' : 'lbs';
    return `No weight entries yet — add your first entry to see progress toward ${targetDisplay} ${unitLabel}.`;
  })();

  // Determine range label for table header
  const rangeLabelText = (() => {
    if (range === 'week') {
      const sunday = new Date(start);
      const saturday = new Date(end);
      return `Week of ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (range === 'month') {
      return referenceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (range === 'year') {
      return 'Month';
    }
    return 'Year';
  })();

  // Handlers for editing entries
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
    // enforce allowed input range
    const minAllowed = 1;
    const maxAllowed = unit === 'kg' ? 700 : 1500;
    if (val < minAllowed || val > maxAllowed) {
      return `Enter a weight between ${minAllowed} and ${maxAllowed} ${unit}`;
    }
    return null;
  }

  // Save edits to an existing entry
  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const validationError = validateWeightInput(editWeight, unit); // validate input
    if (validationError) { // show error if invalid
      setError(validationError);
      return;
    }
    const val = parseFloat(editWeight);
    // Prevent future dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (editDate > todayStr) { // future date
      setError('Cannot update weight for a future date');
      return;
    }
    // convert (if kg) and round to 1 decimal place
    const lbsRaw = unit === 'kg' ? val * 2.20462 : val;
    const lbs = Math.round(lbsRaw * 10) / 10;
    setBusy(true);
    try { // remove old entry and add new one (to handle date changes)
      await remove(editingEntry.id);
      await add({ date: editDate, weightLb: lbs });
      setEditingEntry(null);
      setEditWeight('');
      setEditDate('');
      setError(null);
      setToast('Weight Updated');
      if (toastTimer.current) window.clearTimeout(toastTimer.current); // reset toast timer
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
      // Check if goal was just reached and this is the most recent entry
      if (targetLbs !== null && primaryGoal !== null) {
        let goalReached = false;
        if (primaryGoal === 'lose_weight') {
          goalReached = lbs <= targetLbs;
        } else if (primaryGoal === 'gain_weight') {
          goalReached = lbs >= targetLbs;
        }
        const allDates = [...entries.map(e => e.date), editDate];
        const latestDate = allDates.reduce((a, b) => a > b ? a : b);
        if (goalReached && editDate === latestDate) {
          setTimeout(() => setShowCongrats(true), 500);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingEntry(null);
    setEditWeight('');
    setEditDate('');
    setError(null);
  };

  // Delete the currently editing entry
  const handleDeleteEdit = async () => {
    if (!editingEntry) return;
    setBusy(true);
    try {
      // delete entry
      await remove(editingEntry.id);
      handleCancelEdit();
      setToast('Weight Deleted');
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(null), 3000);
    } finally {
      setBusy(false);
    }
  };

  return ( /* render main UI */
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
                {entries.length === 0 ? (
                  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                    No entries yet - add your first weight to see the chart
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                    No entries in this range
                  </div>
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
                          {rangeLabelText}
                        </th>
                        <th style={{ textAlign: "left", paddingBottom: 8, width: '50%' }}>
                          Weight ({unit}){range === 'year' || range === 'all' ? ' (avg)' : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => {
                        const displayWeight = unit === 'kg' ? Math.round((row.weightLb / 2.20462) * 10) / 10 : row.weightLb;
                        const isClickable = !row.isAggregated;
                        const entry = filteredEntries.find((e: WeightEntry) => e.date === row.date && e.weightLb === row.weightLb);
                        const displayLabel = row.label || new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        return (
                          <tr
                            key={`${row.date}-${row.weightLb}`}
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
                            <td style={{ paddingTop: 8, paddingBottom: 8, width: '50%' }}>{displayLabel}</td>
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
        </div>
      </main>
    </div>
  );
};

export default WeightTracker;
