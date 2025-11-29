import React, { useEffect, useMemo, useState } from 'react';

const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import('firebase/firestore');
  const firebaseAuth = await import('firebase/auth');
  return { db, firestore, firebaseAuth };
};
import type { Meal } from '../../types/meal';
import Toast from '../ui/Toast';

interface MealFormProps {
  onMealAdded: (meal: Meal) => void;
  initialMeal?: Meal | null;
  onInitialMealSet?: () => void;
}

const MealForm: React.FC<MealFormProps> = ({ onMealAdded, initialMeal, onInitialMealSet }) => {
  const [form, setForm] = useState({
    name: '',
    calories: '',
    servingSize: '',
    servingsHad: '',
    totalCarbs: '',
    totalFat: '',
    protein: '',
    fatCategories: '',
    sodium: '',
    sugars: '',
    calcium: '',
    vitamins: '',
    iron: '',
    otherInfo: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  const [showOptional, setShowOptional] = useState(false);
  const [priorMeals, setPriorMeals] = useState<Meal[] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fill form when initialMeal is provided
  useEffect(() => {
    if (initialMeal) {
      setForm({
        name: initialMeal.name || '',
        calories: String(initialMeal.calories ?? ''),
        servingSize: initialMeal.servingSize || '',
        servingsHad: initialMeal.servingsHad != null ? String(initialMeal.servingsHad) : '',
        totalCarbs: initialMeal.totalCarbs != null ? String(initialMeal.totalCarbs) : '',
        totalFat: initialMeal.totalFat != null ? String(initialMeal.totalFat) : '',
        protein: initialMeal.protein != null ? String(initialMeal.protein) : '',
        fatCategories: initialMeal.fatCategories || '',
        sodium: initialMeal.sodium != null ? String(initialMeal.sodium) : '',
        sugars: initialMeal.sugars != null ? String(initialMeal.sugars) : '',
        calcium: initialMeal.calcium != null ? String(initialMeal.calcium) : '',
        vitamins: initialMeal.vitamins || '',
        iron: initialMeal.iron != null ? String(initialMeal.iron) : '',
        otherInfo: initialMeal.otherInfo || '',
      });
      setShowSuggestions(false);
      if (onInitialMealSet) {
        onInitialMealSet();
      }
    }
  }, [initialMeal, onInitialMealSet]);

  // fetch current user on-demand to avoid bundling auth into initial chunk
  const getCurrentUser = async () => {
    const { firebaseAuth } = await resolveFirebase();
    return firebaseAuth.getAuth ? firebaseAuth.getAuth().currentUser : null;
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true });
  };

  const closeToast = () => setToast((t) => ({ ...t, visible: false }));

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'name') setShowSuggestions(true);
  };

  const requiredMissing = () => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push('Meal name');
    if (!form.calories.trim()) missing.push('Calories');
    if (!form.servingSize.trim()) missing.push('Serving size');
    return missing;
  };

  const parseNumber = (val: string): number | undefined => {
    if (!val.trim()) return undefined;
    const n = Number(val);
    return isFinite(n) ? n : undefined;
  };

  // Subscribe to this user's prior meals for predictive suggestions
  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) {
        setPriorMeals([]);
        return;
      }
      const { db, firestore } = await resolveFirebase();
      const qUserMeals = firestore.query(firestore.collection(db, 'meals'), firestore.where('userId', '==', user.uid));
      const unsub = firestore.onSnapshot(
        qUserMeals,
        (snap: any) => {
          const list: Meal[] = [];
          snap.forEach((docSnap: any) => {
            const data = docSnap.data() as Meal;
            list.push({ ...data, id: docSnap.id });
          });
          setPriorMeals(list);
        },
        (err: any) => {
          console.error('Error loading meals for suggestions:', err);
          setPriorMeals([]);
        }
      );
      return () => unsub();
    })();
  }, []);

  const filteredSuggestions = useMemo(() => {
    const term = form.name.trim().toLowerCase();
    if (!term || term.length < 2 || !priorMeals) return [] as Meal[];
    // dedupe by lowercase name; keep latest
    const map = new Map<string, Meal>();
    for (const m of priorMeals) {
      map.set(m.name.toLowerCase(), m);
    }
    const unique = Array.from(map.values());
    const toMs = (v: any) =>
      typeof v === 'number'
        ? v
        : v?.seconds
        ? v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6)
        : v instanceof Date
        ? v.getTime()
        : 0;
    return unique
      .filter((m) => m.name.toLowerCase().includes(term))
      .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
      .slice(0, 5);
  }, [form.name, priorMeals]);

  const applySuggestionToForm = (m: Meal) => {
    setForm({
      name: m.name || '',
      calories: String(m.calories ?? ''),
      servingSize: m.servingSize || '',
      servingsHad: m.servingsHad != null ? String(m.servingsHad) : '',
      totalCarbs: m.totalCarbs != null ? String(m.totalCarbs) : '',
      totalFat: m.totalFat != null ? String(m.totalFat) : '',
      protein: m.protein != null ? String(m.protein) : '',
      fatCategories: m.fatCategories || '',
      sodium: m.sodium != null ? String(m.sodium) : '',
      sugars: m.sugars != null ? String(m.sugars) : '',
      calcium: m.calcium != null ? String(m.calcium) : '',
      vitamins: m.vitamins || '',
      iron: m.iron != null ? String(m.iron) : '',
      otherInfo: m.otherInfo || '',
    });
    setShowSuggestions(false);
  };

  const quickAddSuggestion = async (m: Meal) => {
    const user = await getCurrentUser();
    if (!user) {
      showToast('You must be signed in to save meals', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const base: Meal = {
        userId: user.uid,
        name: m.name,
        calories: m.calories,
        servingSize: m.servingSize,
        createdAt: Date.now(),
      };
      const optional: Partial<Meal> = {};
      // Only include numeric optionals if they are numbers
      if (typeof m.servingsHad === 'number') optional.servingsHad = m.servingsHad;
      if (typeof m.totalCarbs === 'number') optional.totalCarbs = m.totalCarbs;
      if (typeof m.totalFat === 'number') optional.totalFat = m.totalFat;
      if (typeof m.protein === 'number') optional.protein = m.protein;
      if (typeof m.sodium === 'number') optional.sodium = m.sodium;
      if (typeof m.sugars === 'number') optional.sugars = m.sugars;
      if (typeof m.calcium === 'number') optional.calcium = m.calcium;
      if (typeof m.iron === 'number') optional.iron = m.iron;
      // Include string optionals only if non-empty
      if (m.fatCategories && m.fatCategories.trim()) optional.fatCategories = m.fatCategories.trim();
      if (m.vitamins && m.vitamins.trim()) optional.vitamins = m.vitamins.trim();
      if (m.otherInfo && m.otherInfo.trim()) optional.otherInfo = m.otherInfo.trim();

      const meal: Meal = { ...base, ...optional } as Meal;
      const { db, firestore } = await resolveFirebase();
      const ref = await firestore.addDoc(firestore.collection(db, 'meals'), meal);
      const added: Meal = { ...meal, id: ref.id };
      onMealAdded(added);
      showToast('Meal added from suggestion', 'success');
      setForm({
        name: '', calories: '', servingSize: '', servingsHad: '', totalCarbs: '', totalFat: '', protein: '', fatCategories: '', sodium: '', sugars: '', calcium: '', vitamins: '', iron: '', otherInfo: '',
      });
    } catch (e: any) {
      console.error('Quick add failed', e);
      showToast(e.message || 'Failed to add meal', 'error');
    } finally {
      setSubmitting(false);
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await getCurrentUser();
    if (!user) {
      showToast('You must be signed in to save meals', 'error');
      return;
    }
    const missing = requiredMissing();
    if (missing.length) {
      showToast(`Missing required: ${missing.join(', ')}`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      // Build meal object with ONLY defined optional fields (Firestore rejects undefined)
      const mealBase: Meal = {
        userId: user.uid,
        name: form.name.trim(),
        calories: Number(form.calories),
        servingSize: form.servingSize.trim(),
        createdAt: Date.now(),
      };

      const numericOptional: Record<string, string> = {
        servingsHad: form.servingsHad,
        totalCarbs: form.totalCarbs,
        totalFat: form.totalFat,
        protein: form.protein,
        sodium: form.sodium,
        sugars: form.sugars,
        calcium: form.calcium,
        iron: form.iron,
      };

      Object.entries(numericOptional).forEach(([key, raw]) => {
        const parsed = parseNumber(raw);
        if (typeof parsed === 'number') {
          // @ts-expect-error dynamic assignment of optional field
          mealBase[key] = parsed;
        }
      });

      const stringOptional: Record<string, string> = {
        fatCategories: form.fatCategories,
        vitamins: form.vitamins,
        otherInfo: form.otherInfo,
      };
      Object.entries(stringOptional).forEach(([key, raw]) => {
        const trimmed = raw.trim();
        if (trimmed) {
          // @ts-expect-error dynamic assignment of optional field
          mealBase[key] = trimmed;
        }
      });

        const meal: Meal = mealBase;
        const { db, firestore } = await resolveFirebase();
        const ref = await firestore.addDoc(firestore.collection(db, 'meals'), meal);
  console.debug('[MealForm] Added meal', { id: ref.id, meal });
      const added: Meal = { ...meal, id: ref.id };
      onMealAdded(added);
      showToast('Meal saved', 'success');
      setForm({
        name: '', calories: '', servingSize: '', servingsHad: '', totalCarbs: '', totalFat: '', protein: '', fatCategories: '', sodium: '', sugars: '', calcium: '', vitamins: '', iron: '', otherInfo: '',
      });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to save meal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="meal-form" onSubmit={handleSubmit}>
      {/* Required fields */}
      <div className="form-grid">
        <div className="form-field required">
          <label>Meal Name *</label>
          <div className="autocomplete">
            <input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="e.g. Grilled Chicken Salad"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="autocomplete-list">
                {filteredSuggestions.map((m) => (
                  <li key={m.id || m.name} className="autocomplete-item">
                    <button
                      type="button"
                      className="autocomplete-fill"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        applySuggestionToForm(m);
                      }}
                      onClick={() => applySuggestionToForm(m)}
                    >
                      <div className="auto-name">{m.name}</div>
                      <div className="auto-meta">{m.calories} cal • {m.servingSize}</div>
                    </button>
                    <button
                      type="button"
                      className="autocomplete-quick"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void quickAddSuggestion(m);
                      }}
                      onClick={() => void quickAddSuggestion(m)}
                      disabled={submitting}
                      title="Add now"
                    >
                      +
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="form-field required">
          <label>Calories *</label>
          <input type="number" min={0} value={form.calories} onChange={(e) => updateField('calories', e.target.value)} placeholder="e.g. 450" />
        </div>
        <div className="form-field required">
          <label>Serving Size *</label>
          <input value={form.servingSize} onChange={(e) => updateField('servingSize', e.target.value)} placeholder="e.g. 1 bowl" />
        </div>
        <div className="form-field">
          <label>Servings Had</label>
          <input type="number" min={0} step="0.1" value={form.servingsHad} onChange={(e) => updateField('servingsHad', e.target.value)} placeholder="e.g. 1.5" />
        </div>
      </div>

      {/* Toggle for optional fields */}
      <div className="form-toggle-row">
        <button
          type="button"
          className="form-toggle"
          aria-expanded={showOptional}
          aria-controls="optional-meal-fields"
          onClick={() => setShowOptional((v) => !v)}
        >
          <span className={`chev ${showOptional ? 'open' : ''}`}>▾</span>
          {showOptional ? 'Hide optional nutrition' : 'Show more nutrition values'}
        </button>
      </div>

      {/* Optional fields */}
      {showOptional && (
        <div className="form-grid" id="optional-meal-fields">
          <div className="form-field">
            <label>Total Carbs (g)</label>
            <input type="number" min={0} value={form.totalCarbs} onChange={(e) => updateField('totalCarbs', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Total Fat (g)</label>
            <input type="number" min={0} value={form.totalFat} onChange={(e) => updateField('totalFat', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Protein (g)</label>
            <input type="number" min={0} value={form.protein} onChange={(e) => updateField('protein', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Fat Categories</label>
            <input value={form.fatCategories} onChange={(e) => updateField('fatCategories', e.target.value)} placeholder="e.g. Saturated, Unsaturated" />
          </div>
          <div className="form-field">
            <label>Sodium (mg)</label>
            <input type="number" min={0} value={form.sodium} onChange={(e) => updateField('sodium', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Sugars (g)</label>
            <input type="number" min={0} value={form.sugars} onChange={(e) => updateField('sugars', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Calcium (mg)</label>
            <input type="number" min={0} value={form.calcium} onChange={(e) => updateField('calcium', e.target.value)} />
          </div>
          <div className="form-field">
            <label>Vitamins</label>
            <input value={form.vitamins} onChange={(e) => updateField('vitamins', e.target.value)} placeholder="e.g. A, C, D" />
          </div>
          <div className="form-field">
            <label>Iron (mg)</label>
            <input type="number" min={0} value={form.iron} onChange={(e) => updateField('iron', e.target.value)} />
          </div>
          <div className="form-field span-2">
            <label>Other Info / Notes</label>
            <textarea value={form.otherInfo} onChange={(e) => updateField('otherInfo', e.target.value)} rows={3} placeholder="Any additional nutritional notes" />
          </div>
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="response-button" disabled={submitting}>{submitting ? 'Saving…' : 'Save Meal'}</button>
      </div>
      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={closeToast} />
    </form>
  );
};

export default MealForm;
