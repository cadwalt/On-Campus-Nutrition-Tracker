import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, deleteDoc, doc, where } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import type { Meal } from '../../types/meal';
import Toast from '../ui/Toast';
import MealDetailsModal from './modals/MealDetailsModal';
import { calculateActualCalories, calculateActualMacros } from '../../utils/mealCalculations';

const YourMealsList: React.FC = () => {
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

  const [user, setUser] = useState<User | null>(auth.currentUser);

  // Keep user state in sync with Firebase Auth
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubAuth();
  }, []);

  // Subscribe to this user's meals (client-side sort to avoid composite index requirement)
  useEffect(() => {
    if (!user) {
      setMeals([]);
      setLoading(false);
      return;
    }

    const qUserMeals = query(collection(db, 'meals'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      qUserMeals,
      (snap) => {
        const list: Meal[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({ id: d.id, ...(data as Meal) });
        });
        // Sort client-side by createdAt desc (supports number or Firestore Timestamp)
        list.sort((a, b) => {
          const toMillis = (val: any): number => {
            if (typeof val === 'number') return val;
            if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
            if (val instanceof Date) return val.getTime();
            return 0;
          };
        
          return toMillis(b.createdAt) - toMillis(a.createdAt);
        });
        setMeals(list);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading meals:', error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type, visible: true });
  const closeToast = () => setToast((t) => ({ ...t, visible: false }));

  const handleDelete = async (mealId?: string) => {
    if (!mealId) return;
    try {
      await deleteDoc(doc(db, 'meals', mealId));
      showToast('Meal removed', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to remove meal', 'error');
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

  return (
    <div className="meal-list">
      {meals.map((m) => (
        <div
          key={m.id}
          className="meal-item"
          style={{ cursor: 'pointer' }}
          onClick={() => { setSelectedMeal(m); setDetailsOpen(true); }}
        >
          <div className="meal-left">
            <div className="meal-time">
              {(() => {
                const v: any = m.createdAt as any;
                const ms = typeof v === 'number'
                  ? v
                  : v && typeof v.seconds === 'number'
                    ? v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6)
                    : v instanceof Date
                      ? v.getTime()
                      : 0;
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
