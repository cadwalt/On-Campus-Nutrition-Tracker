import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { Meal } from '../../../types/meal';
import { resolveFirebase } from '../../../lib/resolveFirebase';
import { computeNutritionPlan } from '../../../utils/nutritionPlan';
import type { NutritionGoals } from '../../../types/nutrition';
import PlannedMealCard from './PlannedMealCard';
import NutritionProjection from './NutritionProjection';
import MealForm from '../MealForm';
import { XIcon, AlertTriangleIcon } from '../../ui/Icons';

interface PlannedMeal extends Meal {
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  plannedDate: string; // ISO date string
}

interface DailyPlannerProps {
  selectedDate: Date;
  user: User | null;
  onMealAdded?: () => void;
}

const DailyPlanner: React.FC<DailyPlannerProps> = ({ selectedDate, user, onMealAdded }) => {
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
  const [nutritionPlan, setNutritionPlan] = useState<ReturnType<typeof computeNutritionPlan> | null>(null);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'>('Lunch');

  const dateKey = selectedDate.toISOString().split('T')[0];

  // Load nutrition goals
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const goals = data.nutrition_goals as NutritionGoals | undefined;
          if (goals) {
            setNutritionGoals(goals);
            setNutritionPlan(computeNutritionPlan(goals));
          }
        }
      } catch (err) {
        console.error('Error loading nutrition goals:', err);
      }
    })();
  }, [user]);

  // Load planned meals for selected date
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        // Firestore path structure: mealPlans/{userId}/dates/{date}/meals
        const mealPlansRef = firestore.collection(db, 'mealPlans');
        const userPlanDocRef = firestore.doc(mealPlansRef, user.uid);
        const datesRef = firestore.collection(userPlanDocRef, 'dates');
        const dateDocRef = firestore.doc(datesRef, dateKey);
        const mealsRef = firestore.collection(dateDocRef, 'meals');

        unsub = firestore.onSnapshot(mealsRef, (snap: any) => {
          const meals: PlannedMeal[] = [];
          snap.forEach((doc: any) => {
            const data = doc.data();
            meals.push({
              ...data,
              id: doc.id,
              mealType: data.mealType || 'Lunch',
              plannedDate: dateKey,
            } as PlannedMeal);
          });
          setPlannedMeals(meals);
          setLoading(false);
        });
      } catch (err) {
        console.error('Error loading planned meals:', err);
        setLoading(false);
      }
    })();

    return () => { if (unsub) unsub(); };
  }, [user, dateKey]);

  const handleRemoveMeal = async (mealId: string) => {
    if (!user) return;

    try {
      const { db, firestore } = await resolveFirebase();
      const mealPlansRef = firestore.collection(db, 'mealPlans');
      const userPlansRef = firestore.collection(mealPlansRef, user.uid);
      const datePlanRef = firestore.doc(userPlansRef, dateKey);
      const mealsRef = firestore.collection(datePlanRef, 'meals');
      const mealRef = firestore.doc(mealsRef, mealId);

      await firestore.deleteDoc(mealRef);
    } catch (err) {
      console.error('Error removing planned meal:', err);
      alert('Failed to remove meal. Please try again.');
    }
  };

  const handleAddPlannedMeal = async (meal: Meal) => {
    if (!user) {
      alert('Please sign in to plan meals.');
      return;
    }

    // Prevent adding meals to past dates
    if (isPastDate(selectedDate)) {
      alert('Cannot add meals to past dates.');
      return;
    }

    try {
      const { db, firestore } = await resolveFirebase();
      // Firestore path structure: mealPlans/{userId}/dates/{date}/meals
      // This gives us an odd number of segments (5): collection/doc/collection/doc/collection
      const mealPlansRef = firestore.collection(db, 'mealPlans');
      const userPlanDocRef = firestore.doc(mealPlansRef, user.uid); // Document for user
      const datesRef = firestore.collection(userPlanDocRef, 'dates'); // Subcollection for dates
      const dateDocRef = firestore.doc(datesRef, dateKey); // Document for specific date
      const mealsRef = firestore.collection(dateDocRef, 'meals'); // Subcollection for meals

      // Ensure date plan document exists
      await firestore.setDoc(dateDocRef, {
        date: dateKey,
        userId: user.uid,
        createdAt: Date.now(),
      }, { merge: true });

      // Add meal with mealType to planned meals collection
      // Note: This is separate from the regular 'meals' collection
      await firestore.addDoc(mealsRef, {
        ...meal,
        userId: user.uid, // Ensure userId is included
        mealType: selectedMealType,
        plannedDate: dateKey,
        isPlanned: true,
        createdAt: Date.now(), // Ensure createdAt is set
      });

      setShowAddMeal(false);
      onMealAdded?.();
    } catch (err: any) {
      console.error('Error adding planned meal:', err);
      alert(`Failed to add meal to plan. ${err.message || 'Please try again.'}`);
    }
  };

  // Calculate projected nutrition
  const projected = React.useMemo(() => {
    return plannedMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.calories || 0),
        protein: acc.protein + (meal.protein || 0),
        totalCarbs: acc.totalCarbs + (meal.totalCarbs || 0),
        totalFat: acc.totalFat + (meal.totalFat || 0),
      }),
      { calories: 0, protein: 0, totalCarbs: 0, totalFat: 0 }
    );
  }, [plannedMeals]);

  // Get targets from nutrition plan
  const targets = React.useMemo(() => {
    if (!nutritionPlan) {
      return { calories: 2000, protein: 0, totalCarbs: 0, totalFat: 0 };
    }

    return {
      calories: nutritionPlan.targetCalories,
      protein: nutritionPlan.macroGrams.protein,
      totalCarbs: nutritionPlan.macroGrams.carbs,
      totalFat: nutritionPlan.macroGrams.fat,
    };
  }, [nutritionPlan]);

  // Group meals by type
  const mealsByType = React.useMemo(() => {
    const groups: Record<string, PlannedMeal[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snack: [],
    };

    plannedMeals.forEach((meal) => {
      if (groups[meal.mealType]) {
        groups[meal.mealType].push(meal);
      }
    });

    return groups;
  }, [plannedMeals]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  if (!user) {
    return (
      <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
        Please sign in to use meal planning.
      </div>
    );
  }

  if (loading) {
    return <div className="muted">Loading planner...</div>;
  }

  const isPast = isPastDate(selectedDate);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.25rem' }}>Meal Plan for {formatDate(selectedDate)}</h2>
        {isPast ? (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '6px',
            color: '#fca5a5',
            fontSize: '0.875rem',
            marginTop: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangleIcon size={16} style={{ color: '#fca5a5', flexShrink: 0 }} />
            <span>This date has already passed. You cannot plan meals for past dates.</span>
          </div>
        ) : (
          <p style={{ color: 'var(--muted, #9aa7bf)', margin: 0, fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Plan your meals in advance to meet your nutrition goals.
          </p>
        )}
      </div>

      <div className="daily-planner-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Main content - meal sections */}
        <div>
          {/* Meal type sections */}
          {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const).map((mealType) => (
            <div key={mealType} style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
              }}>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--muted, #9aa7bf)' }}>
                  {mealType}
                </h3>
                <button
                  onClick={() => {
                    if (!isPast) {
                      setSelectedMealType(mealType);
                      setShowAddMeal(true);
                    }
                  }}
                  disabled={isPast}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: isPast ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.2)',
                    border: isPast ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '4px',
                    color: isPast ? 'rgba(255, 255, 255, 0.3)' : '#a5b4fc',
                    fontSize: '0.8125rem',
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    fontWeight: 500,
                    opacity: isPast ? 0.5 : 1
                  }}
                >
                  + Add {mealType}
                </button>
              </div>

              {mealsByType[mealType].length === 0 ? (
                <div style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: 'var(--muted, #9aa7bf)',
                  fontSize: '0.875rem'
                }}>
                  No {mealType.toLowerCase()} planned
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {mealsByType[mealType].map((meal) => (
                    <PlannedMealCard
                      key={meal.id}
                      meal={meal}
                      mealType={meal.mealType}
                      onRemove={() => handleRemoveMeal(meal.id!)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Nutrition projection - below meals on mobile, beside on desktop */}
        <div className="nutrition-projection-container">
          <NutritionProjection
            projected={projected}
            targets={targets}
            nutritionPlan={nutritionPlan || undefined}
          />
        </div>
      </div>

      {/* Add meal form modal */}
      {showAddMeal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--bg-secondary, #1e293b)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ margin: 0 }}>Add {selectedMealType}</h3>
              <button
                onClick={() => setShowAddMeal(false)}
                style={{
                  padding: '0.375rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                <XIcon size={20} />
              </button>
            </div>
            <MealForm
              planningMode={true}
              onMealAdded={(meal) => {
                handleAddPlannedMeal(meal);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyPlanner;

