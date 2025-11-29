import React, { useEffect, useState, useMemo } from 'react';
import type { User } from 'firebase/auth';
// Runtime resolver for firebase to avoid bundling into initial chunk
const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const auth = (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import('firebase/firestore');
  return { auth, db, firestore };
};
import type { Meal } from '../../types/meal';
import Toast from '../ui/Toast';
import MealDetailsModal from './modals/MealDetailsModal';
import { calculateActualCalories, calculateActualMacros } from '../../utils/mealCalculations';
import { canAccess } from '../../utils/authorization';

type SortByType = 'date' | 'calories' | 'name';
type SortOrderType = 'asc' | 'desc';

interface YourMealsListProps {
  searchQuery?: string;
  dateRange?: { startMs: number; endMs: number } | null;
  sortBy?: SortByType;
  sortOrder?: SortOrderType;
  onFillForm?: (meal: Meal) => void;
}

const YourMealsList: React.FC<YourMealsListProps> = ({ 
  searchQuery = '', 
  dateRange = null,
  sortBy = 'date',
  sortOrder = 'desc',
  onFillForm
}) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Keep the modal's selected meal in sync after edits (snapshot updates meals)
  useEffect(() => {
    if (!detailsOpen || !selectedMeal?.id) return;
    const updated = meals.find((m) => m.id === selectedMeal.id);
    if (updated) setSelectedMeal(updated);
  }, [meals, detailsOpen, selectedMeal?.id]);

  const [user, setUser] = useState<User | null>(null);

  // Keep user state in sync with Firebase Auth
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth } = await resolveFirebase();
        const firebaseAuth = await import('firebase/auth');
        unsub = firebaseAuth.onAuthStateChanged(auth, (u: User | null) => setUser(u));
      } catch (err) {
        console.error('Auth listener init failed', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Helper function to convert createdAt to milliseconds
  const toMillis = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
    if (val instanceof Date) return val.getTime();
    return 0;
  };

  // Subscribe to this user's meals (client-side sort to avoid composite index requirement)
  useEffect(() => {
    if (!user) {
      setMeals([]);
      setLoading(false);
      return;
    }

    let unsubLocal: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const qUserMeals = firestore.query(firestore.collection(db, 'meals'), firestore.where('userId', '==', user.uid));
        unsubLocal = firestore.onSnapshot(
          qUserMeals,
          (snap: any) => {
            const list: Meal[] = [];
            snap.forEach((d: any) => {
              const data = d.data() as any;
              list.push({ id: d.id, ...(data as Meal) });
            });
            // Sort client-side by createdAt desc (supports number or Firestore Timestamp)
            list.sort((a, b) => {
              return toMillis(b.createdAt) - toMillis(a.createdAt);
            });
            setMeals(list);
            setLoading(false);
          },
          (error: any) => {
            console.error('Error loading meals:', error);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Failed to subscribe to meals', err);
        setLoading(false);
      }
    })();
    return () => { if (unsubLocal) unsubLocal(); };
  }, [user]);

  // Apply search, date filters, and sorting
  const filteredMeals = useMemo(() => {
    let filtered = [...meals];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((meal) => 
        meal.name.toLowerCase().includes(query)
      );
    }

    // Apply date filter
    if (dateRange) {
      filtered = filtered.filter((meal) => {
        const mealMs = toMillis(meal.createdAt);
        return mealMs >= dateRange.startMs && mealMs <= dateRange.endMs;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          const aMs = toMillis(a.createdAt);
          const bMs = toMillis(b.createdAt);
          comparison = aMs - bMs;
          break;
        
        case 'calories':
          const aCals = calculateActualCalories(a);
          const bCals = calculateActualCalories(b);
          comparison = aCals - bCals;
          break;
        
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        
        default:
          comparison = 0;
      }

      // Apply sort order (ascending or descending)
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [meals, searchQuery, dateRange, sortBy, sortOrder]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type, visible: true });
  const closeToast = () => setToast((t) => ({ ...t, visible: false }));

  const handleDelete = async (mealId?: string) => {
    if (!mealId || !user) return;
    
    const mealToDelete = meals.find(m => m.id === mealId);
    if (!mealToDelete) {
      showToast('Meal not found', 'error');
      return;
    }
    
    if (!canAccess(user.uid, mealToDelete.userId)) {
      showToast('Unauthorized: Cannot delete this meal', 'error');
      return;
    }
    
    try {
      const { db, firestore } = await resolveFirebase();
      await firestore.deleteDoc(firestore.doc(db, 'meals', mealId));
      showToast('Meal removed', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to remove meal', 'error');
    }
  };

  const handleMealClick = (meal: Meal) => {
    if (!user) {
      showToast('You must be signed in to view meal details', 'error');
      return;
    }
    
    if (!canAccess(user.uid, meal.userId)) {
      showToast('Unauthorized: Cannot access this meal', 'error');
      return;
    }
    
    setSelectedMeal(meal);
    setDetailsOpen(true);
  };

  const handleDuplicate = async (meal: Meal) => {
    if (!user) {
      showToast('You must be signed in to duplicate meals', 'error');
      return;
    }

    if (!canAccess(user.uid, meal.userId)) {
      showToast('Unauthorized: Cannot duplicate this meal', 'error');
      return;
    }

    try {
      const { db, firestore } = await resolveFirebase();
      const base: Meal = {
        userId: user.uid,
        name: meal.name,
        calories: meal.calories,
        servingSize: meal.servingSize,
        createdAt: Date.now(),
      };
      const optional: Partial<Meal> = {};
      if (typeof meal.servingsHad === 'number') optional.servingsHad = meal.servingsHad;
      if (typeof meal.totalCarbs === 'number') optional.totalCarbs = meal.totalCarbs;
      if (typeof meal.totalFat === 'number') optional.totalFat = meal.totalFat;
      if (typeof meal.protein === 'number') optional.protein = meal.protein;
      if (typeof meal.sodium === 'number') optional.sodium = meal.sodium;
      if (typeof meal.sugars === 'number') optional.sugars = meal.sugars;
      if (typeof meal.calcium === 'number') optional.calcium = meal.calcium;
      if (typeof meal.iron === 'number') optional.iron = meal.iron;
      if (meal.fatCategories && meal.fatCategories.trim()) optional.fatCategories = meal.fatCategories.trim();
      if (meal.vitamins && meal.vitamins.trim()) optional.vitamins = meal.vitamins.trim();
      if (meal.otherInfo && meal.otherInfo.trim()) optional.otherInfo = meal.otherInfo.trim();

      const newMeal: Meal = { ...base, ...optional } as Meal;
      await firestore.addDoc(firestore.collection(db, 'meals'), newMeal);
      showToast('Meal duplicated', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to duplicate meal', 'error');
    }
  };

  if (!user) {
    return <div className="muted">Sign in to view your meals.</div>;
  }

  if (loading) {
    return <div className="muted">Loading meals…</div>;
  }

  if (meals.length === 0) {
    return <div className="muted">No meals yet. Your saved meals will appear here.</div>;
  }

  if (filteredMeals.length === 0) {
    const hasFilters = searchQuery.trim() || dateRange;
    return (
      <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
        {hasFilters ? (
          <>
            <p style={{ marginBottom: '0.5rem' }}>No meals found matching your filters.</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted, #9aa7bf)' }}>
              Try adjusting your search or date range.
            </p>
          </>
        ) : (
          'No meals yet. Your saved meals will appear here.'
        )}
      </div>
    );
  }

  return (
    <div className="meal-list">
      {filteredMeals.length < meals.length && (
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.75rem', 
          background: 'rgba(99, 102, 241, 0.1)', 
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: 'var(--muted, #9aa7bf)'
        }}>
          Showing {filteredMeals.length} of {meals.length} meal{meals.length !== 1 ? 's' : ''}
        </div>
      )}
      {filteredMeals.map((m) => (
        <div
          key={m.id}
          className="meal-item"
          style={{ cursor: 'pointer' }}
          onClick={() => handleMealClick(m)}
        >
          <div className="meal-left">
            <div className="meal-time">
              {(() => {
                const ms = toMillis(m.createdAt);
                return ms ? new Date(ms).toLocaleString() : '';
              })()}
            </div>
            <div className="meal-name">
              {m.name} <small style={{ color: '#94a3b8' }}>({m.servingSize}{m.servingsHad ? ` × ${m.servingsHad}` : ''})</small>
            </div>
            <div className="meal-subtext" style={{ color: '#9aa7bf', fontSize: 12, marginTop: 4 }}>
              {(() => {
                const actualCals = calculateActualCalories(m);
                const macros = calculateActualMacros(m);
                return `${actualCals} cal • ${macros.protein ?? '-'}g protein • ${macros.carbs ?? '-'}g carbs • ${macros.fat ?? '-'}g fat`;
              })()}
            </div>
          </div>
          <div className="meal-right">
            <div className="meal-calories">{calculateActualCalories(m)} cal</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {onFillForm && (
                <button
                  className="cancel-button"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onFillForm(m);
                  }}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.8125rem',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                    color: '#a5b4fc'
                  }}
                  title="Fill form with this meal"
                >
                  Fill Form
                </button>
              )}
              <button
                className="cancel-button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleDuplicate(m);
                }}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  color: '#86efac'
                }}
                title="Duplicate this meal"
              >
                Duplicate
              </button>
              <button
                className="cancel-button"
                onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                title="Remove this meal"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={closeToast} />
      <MealDetailsModal
        isOpen={detailsOpen}
        meal={selectedMeal}
        onClose={() => { setDetailsOpen(false); setSelectedMeal(null); }}
      />
    </div>
  );
};

export default YourMealsList;
