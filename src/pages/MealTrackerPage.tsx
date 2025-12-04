import React, { useState, useMemo, useEffect } from 'react';
import MealForm from '../components/features/MealForm';
import YourMealsList from '../components/features/YourMealsList';
import TodaySummaryCard from '../components/features/TodaySummaryCard';
import RestaurantList from '../components/features/restaurants/RestaurantList';
import MenuView from '../components/features/restaurants/MenuView';
import { WeeklyCalendar, DailyPlanner } from '../components/features/planning';
import Tabs from '../components/ui/Tabs';
import { UtensilsIcon, CalendarIcon, PackageIcon } from '../components/ui/Icons';
import type { Meal } from '../types/meal';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../lib/resolveFirebase';

type DateFilterType = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom';
type SortByType = 'date' | 'calories' | 'name';
type SortOrderType = 'asc' | 'desc';

type TabType = 'overview' | 'restaurants' | 'planning';

const MealTrackerPage: React.FC = () => {
  // Tab state - remember last selected tab
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('mealTrackerActiveTab');
    return (saved as TabType) || 'overview';
  });

  // Overview tab state
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('date');
  const [sortOrder, setSortOrder] = useState<SortOrderType>('desc');
  const [user, setUser] = useState<User | null>(null);

  // Track auth state
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveFirebase();
        unsub = firebaseAuth.onAuthStateChanged(auth, (u: User | null) => setUser(u));
      } catch (err) {
        console.error('Auth listener init failed', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Save tab selection to localStorage
  useEffect(() => {
    localStorage.setItem('mealTrackerActiveTab', activeTab);
  }, [activeTab]);

  // Calculate date range based on filter type
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();
    let end = new Date();

    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startMs: start.getTime(), endMs: end.getTime() };
      
      case 'thisWeek':
        const dayOfWeek = now.getDay();
        // Get Monday of current week (Monday = 1, Sunday = 0)
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise go to Monday
        start.setDate(now.getDate() + diff);
        start.setHours(0, 0, 0, 0);
        // Set end to Sunday of same week (6 days after Monday)
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { startMs: start.getTime(), endMs: end.getTime() };
      
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of current month
        end.setHours(23, 59, 59, 999);
        return { startMs: start.getTime(), endMs: end.getTime() };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          const customStart = new Date(customStartDate);
          const customEnd = new Date(customEndDate);
          customStart.setHours(0, 0, 0, 0);
          customEnd.setHours(23, 59, 59, 999);
          return { startMs: customStart.getTime(), endMs: customEnd.getTime() };
        }
        return null;
      
      default:
        return null; // 'all' - no date filtering
    }
  }, [dateFilter, customStartDate, customEndDate]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <UtensilsIcon size={18} /> },
    { id: 'restaurants', label: 'OU Restaurants', icon: <PackageIcon size={18} /> },
    { id: 'planning', label: 'Meal Planning', icon: <CalendarIcon size={18} /> },
  ];

  // Overview Tab Content
  const OverviewTab = () => (
    <div className="overview-content">
      <TodaySummaryCard />

      <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Add a Meal</h2>
          <p style={{ color: 'var(--muted, #9aa7bf)', marginTop: 6 }}>
            Provide nutrition facts for a meal you ate. Required fields are marked with an asterisk (*).
          </p>
          <div style={{ marginTop: 16 }}>
            <MealForm 
              onMealAdded={() => { /* no-op; list auto updates via snapshot */ }}
            />
          </div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Your Meals</h2>
              <p style={{ color: 'var(--muted, #9aa7bf)', marginTop: 6, marginBottom: 0 }}>
                Previously saved meals with basic macro details.
              </p>
            </div>
          </div>

          {/* Filter Controls*/}
          <div style={{ 
            marginBottom: '1rem', 
            padding: '0.75rem', 
            background: 'rgba(255, 255, 255, 0.03)', 
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {/* Controls Row: Sort and Date Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Sort Controls */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortByType)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    outline: 'none',
                    minWidth: '100px',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                >
                  <option value="date">Date</option>
                  <option value="calories">Calories</option>
                  <option value="name">Name</option>
                </select>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '2.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Date Filters */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {(['all', 'today', 'thisWeek', 'thisMonth', 'custom'] as DateFilterType[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDateFilter(filter);
                      if (filter !== 'custom') {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }
                    }}
                    style={{
                      padding: '0.4rem 0.75rem',
                      background: dateFilter === filter 
                        ? 'rgba(99, 102, 241, 0.3)' 
                        : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${dateFilter === filter ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (dateFilter !== filter) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (dateFilter !== filter) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                  >
                    {filter === 'all' ? 'All' : 
                     filter === 'today' ? 'Today' :
                     filter === 'thisWeek' ? 'Week' :
                     filter === 'thisMonth' ? 'Month' :
                     'Custom'}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range Inputs */}
            {dateFilter === 'custom' && (
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                flexWrap: 'wrap',
                padding: '0.5rem',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '6px',
                transition: 'opacity 0.2s ease'
              }}>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  style={{
                    flex: 1,
                    minWidth: '140px',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.8125rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                />
              </div>
            )}
          </div>

          <div className="meals-list-wrapper" style={{ marginTop: 12 }}>
            <YourMealsList 
              dateRange={dateRange}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
          </div>
        </div>
      </div>
  );

  // OU Restaurants Tab State
  const [selectedRestaurant, setSelectedRestaurant] = useState<{ id: string; name: string; location: string } | null>(null);
  const [restaurantLocationFilter, setRestaurantLocationFilter] = useState<string>('');
  const [restaurantMealTypeFilter, setRestaurantMealTypeFilter] = useState<string>('');

  // OU Restaurants Tab Content
  const RestaurantsTab = () => {
    const handleAddToMeals = async (menuItem: any) => {
      if (!user) {
        alert('Please sign in to add meals');
        return;
      }

      try {
        const { db, firestore } = await resolveFirebase();
        const meal: Meal = {
          userId: user.uid,
          name: menuItem.name,
          calories: menuItem.nutritionInfo.calories,
          servingSize: menuItem.servingSize,
          createdAt: Date.now(),
        };

        // Add optional nutrition fields
        if (menuItem.nutritionInfo.protein !== undefined) meal.protein = menuItem.nutritionInfo.protein;
        if (menuItem.nutritionInfo.totalCarbs !== undefined) meal.totalCarbs = menuItem.nutritionInfo.totalCarbs;
        if (menuItem.nutritionInfo.totalFat !== undefined) meal.totalFat = menuItem.nutritionInfo.totalFat;
        if (menuItem.nutritionInfo.sodium !== undefined) meal.sodium = menuItem.nutritionInfo.sodium;
        if (menuItem.nutritionInfo.sugars !== undefined) meal.sugars = menuItem.nutritionInfo.sugars;
        if (menuItem.nutritionInfo.calcium !== undefined) meal.calcium = menuItem.nutritionInfo.calcium;
        if (menuItem.nutritionInfo.iron !== undefined) meal.iron = menuItem.nutritionInfo.iron;

        // Add other info
        if (menuItem.description) {
          meal.otherInfo = `From ${selectedRestaurant?.name || 'restaurant'}. ${menuItem.description}`;
        }
        if (menuItem.allergens.length > 0) {
          const allergenNote = `Allergens: ${menuItem.allergens.join(', ')}`;
          meal.otherInfo = meal.otherInfo ? `${meal.otherInfo}. ${allergenNote}` : allergenNote;
        }

        await firestore.addDoc(firestore.collection(db, 'meals'), meal);
        
        // Show success and optionally switch to Overview tab
        if (confirm('Meal added successfully! Switch to Overview tab to see it?')) {
          setActiveTab('overview');
        }
      } catch (error: any) {
        console.error('Error adding meal:', error);
        alert('Failed to add meal. Please try again.');
      }
    };

    if (selectedRestaurant) {
      return (
        <div className="card">
          <MenuView
            restaurant={selectedRestaurant}
            onBack={() => setSelectedRestaurant(null)}
            onAddToMeals={handleAddToMeals}
          />
        </div>
      );
    }

    return (
      <div className="card">
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>OU Campus Restaurants</h2>
          <p style={{ color: 'var(--muted, #9aa7bf)', margin: 0 }}>
            Browse OU campus dining locations and quickly log meals with pre-filled nutrition information.
          </p>
        </div>

        <RestaurantList
          onSelectRestaurant={(restaurant) => setSelectedRestaurant(restaurant)}
          locationFilter={restaurantLocationFilter}
          mealTypeFilter={restaurantMealTypeFilter}
          onLocationFilterChange={setRestaurantLocationFilter}
          onMealTypeFilterChange={setRestaurantMealTypeFilter}
        />
      </div>
    );
  };

  // Meal Planning Tab State
  const [selectedPlanningDate, setSelectedPlanningDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [plannedMealsCount, setPlannedMealsCount] = useState<Record<string, number>>({});
  const [projectedCalories, setProjectedCalories] = useState<Record<string, number>>({});
  const [targetCalories, setTargetCalories] = useState(2000);

  // Load nutrition goals for target calories
  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const goals = data.nutrition_goals;
          if (goals) {
            const { computeNutritionPlan } = await import('../utils/nutritionPlan');
            const plan = computeNutritionPlan(goals);
            if (plan) {
              setTargetCalories(plan.targetCalories);
            }
          }
        }
      } catch (err) {
        console.error('Error loading nutrition goals:', err);
      }
    })();
  }, [user]);

  // Load planned meals counts for calendar
  useEffect(() => {
    if (!user) return;

    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        // Firestore path structure: mealPlans/{userId}/dates/{date}/meals
        const mealPlansRef = firestore.collection(db, 'mealPlans');
        const userPlanDocRef = firestore.doc(mealPlansRef, user.uid);
        const datesRef = firestore.collection(userPlanDocRef, 'dates');

        // Get all date plans
        unsub = firestore.onSnapshot(datesRef, async (snap: any) => {
          const counts: Record<string, number> = {};
          const calories: Record<string, number> = {};

          for (const doc of snap.docs) {
            const dateKey = doc.id;
            const mealsRef = firestore.collection(doc.ref, 'meals');
            const mealsSnap = await firestore.getDocs(mealsRef);
            
            counts[dateKey] = mealsSnap.size;
            
            let totalCal = 0;
            mealsSnap.forEach((mealDoc: any) => {
              const mealData = mealDoc.data();
              totalCal += mealData.calories || 0;
            });
            calories[dateKey] = totalCal;
          }

          setPlannedMealsCount(counts);
          setProjectedCalories(calories);
        });
      } catch (err) {
        console.error('Error loading planned meals counts:', err);
      }
    })();

    return () => { if (unsub) unsub(); };
  }, [user]);

  // Meal Planning Tab Content
  const PlanningTab = () => {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <WeeklyCalendar
            selectedDate={selectedPlanningDate}
            onDateSelect={setSelectedPlanningDate}
            plannedMealsCount={plannedMealsCount}
            projectedCalories={projectedCalories}
            targetCalories={targetCalories}
          />
        </div>

        <div className="card">
          <DailyPlanner
            selectedDate={selectedPlanningDate}
            user={user}
            onMealAdded={() => {
              // Refresh counts
              const dateKey = selectedPlanningDate.toISOString().split('T')[0];
              // The snapshot listener will update automatically
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="page meal-tracker-page">
      <main className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-left" style={{ width: '100%' }}>
            <Tabs 
              tabs={tabs} 
              activeTab={activeTab} 
              onTabChange={(tabId) => setActiveTab(tabId as TabType)} 
            />

            <div className="tabs-content">
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'restaurants' && <RestaurantsTab />}
              {activeTab === 'planning' && <PlanningTab />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MealTrackerPage;
