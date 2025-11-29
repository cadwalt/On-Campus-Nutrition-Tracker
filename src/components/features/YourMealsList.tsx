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

interface YourMealsListProps {
  searchQuery?: string;
  dateRange?: { startMs: number; endMs: number } | null;
}

const YourMealsList: React.FC<YourMealsListProps> = ({ searchQuery = '', dateRange = null }) => {
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

  // Apply search and date filters
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

    return filtered;
  }, [meals, searchQuery, dateRange]);

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
            <button
              className="cancel-button"
              onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
            >
              Remove
            </button>
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
