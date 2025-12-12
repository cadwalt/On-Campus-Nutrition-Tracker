import React, { useEffect, useMemo, useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../lib/resolveFirebase';
import type { Meal } from '../../types/meal';
import { calculateActualMicros } from '../../utils/mealCalculations';
import { sanitizeMealInput } from '../../utils/mealValidation';

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
  const [customNotes, setCustomNotes] = useState<string[]>([]);
  const [currentNoteText, setCurrentNoteText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    // load any saved notes from local storage to avoid extra db writes
    const saved = localStorage.getItem('micronutrient_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCustomNotes(parsed);
      } catch (e) {
        console.error('Failed to parse saved notes', e);
      }
    }
  }, []);

  // auto-resize textarea to fit content, but prevent dragging beyond content height
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // reset height to auto to get accurate scrollHeight
      textarea.style.height = 'auto';
      const contentHeight = textarea.scrollHeight;
      // set height to content height, with min of 80px
      textarea.style.height = `${Math.max(80, contentHeight)}px`;
      // cap maxHeight at content height so it can't be dragged beyond what's needed
      textarea.style.maxHeight = `${contentHeight}px`;
    }
  }, [currentNoteText, editingIndex]);

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

  const handleAddNote = () => {
    if (!currentNoteText.trim()) return;
    // sanitize note to strip script-y characters before storing (keep spacing)
    const cleaned = sanitizeMealInput(currentNoteText.trim());
    const updated = editingIndex !== null
      ? customNotes.map((note, idx) => idx === editingIndex ? cleaned : note)
      : [...customNotes, cleaned];
    setCustomNotes(updated);
    localStorage.setItem('micronutrient_notes', JSON.stringify(updated));
    setCurrentNoteText('');
    setEditingIndex(null);
  };

  const handleEditNote = (index: number) => {
    setCurrentNoteText(customNotes[index]);
    setEditingIndex(index);
  };

  const handleRemoveNote = (index: number) => {
    const updated = customNotes.filter((_, idx) => idx !== index);
    setCustomNotes(updated);
    localStorage.setItem('micronutrient_notes', JSON.stringify(updated));
    if (editingIndex === index) {
      setCurrentNoteText('');
      setEditingIndex(null);
    }
  };

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

      <div style={{ marginTop: '1.25rem' }}>
        <label style={{ display: 'block', color: '#e2e8f0', fontWeight: 600, marginBottom: '0.35rem' }}>
          Custom micronutrient notes
        </label>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <textarea
            ref={textareaRef}
            value={currentNoteText}
            onChange={(e) => setCurrentNoteText(e.target.value)}
            placeholder="Add personal targets or reminders"
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#e2e8f0',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
          {currentNoteText.trim() && (
            <button
              onClick={handleAddNote}
              style={{
                padding: '0.6rem 0.85rem',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                color: '#60a5fa',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {editingIndex !== null ? 'Update' : 'Add Note'}
            </button>
          )}
        </div>
        {editingIndex !== null && (
          <button
            onClick={() => {
              setCurrentNoteText('');
              setEditingIndex(null);
            }}
            style={{
              marginTop: '0.5rem',
              marginLeft: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
            }}
          >
            Cancel
          </button>
        )}
        {customNotes.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            {customNotes.map((note, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    color: '#cbd5e1',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {note}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button
                    onClick={() => handleEditNote(index)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemoveNote(index)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '6px',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '0.75rem',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MicronutrientSummary;

