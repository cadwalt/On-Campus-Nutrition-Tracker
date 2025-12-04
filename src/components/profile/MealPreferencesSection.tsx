import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
// Use shared lazy resolver to import Firebase clients/modules at runtime
import { resolveFirebase } from '../../lib/resolveFirebase';
import type { CookingSkill, NutritionGoals } from '../../types/nutrition';
import type { FavoriteItem } from '../../types/favorite';
import { getFavoritesForUser, addFavoriteForUser, removeFavoriteForUser, updateFavoriteForUser } from '../services/favoritesService';
import { COOKING_SKILLS } from '../../constants/nutrition';
import MealPreferencesModal from './modals/MealPreferencesModal';
import MealDetailsModal from '../features/modals/MealDetailsModal';
import { Tooltip } from '../ui';

interface MealPreferencesSectionProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const MealPreferencesSection: React.FC<MealPreferencesSectionProps> = ({ 
  user, 
  onSuccess, 
  onError 
}) => {
  const [cookingSkill, setCookingSkill] = useState<CookingSkill | null>(null);
  const [mealFrequency, setMealFrequency] = useState<number>(3);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [newFavorite, setNewFavorite] = useState<string>('');
  const [newNutrition, setNewNutrition] = useState<{
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    servingSize?: string;
    fatCategories?: string;
    sodium?: number;
    sugars?: number;
    calcium?: number;
    iron?: number;
    vitamins?: string;
    otherInfo?: string;
  }>({});
  const [showFavOptional, setShowFavOptional] = useState(false);
  const [expandedFavorites, setExpandedFavorites] = useState<Record<string, boolean>>({});
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [selectedFavMeal, setSelectedFavMeal] = useState<any | null>(null);
  const [favModalOpen, setFavModalOpen] = useState(false);

  // Load existing meal preferences from Firestore
  useEffect(() => {
    const loadMealPreferences = async () => {
      if (user) {
        try {
          const { db, firestore } = await resolveFirebase();
          const userDocRef = firestore.doc(db, 'users', user.uid);
          const userDocSnap = await firestore.getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const goals = data.nutrition_goals;
            setNutritionGoals(goals || null);
            setCookingSkill(goals?.preferences?.cooking_skill || null);
            setMealFrequency(goals?.preferences?.meal_frequency || 3);
            // Load structured favorites if present, otherwise fallback to legacy array
            const favsV2 = data.favorites_v2 || null;
            if (Array.isArray(favsV2)) {
              setFavorites(favsV2 as FavoriteItem[]);
            } else {
              const legacy = data.favorites || [];
              setFavorites(Array.isArray(legacy) ? legacy.map((n: string, i: number) => ({ id: `legacy_${i}_${n.replace(/\s+/g, '_')}`, name: n, source: 'manual', created_at: Date.now() })) : []);
            }

            // Load recent meals for quick add-from-history
            try {
              const mealsRef = firestore.query(firestore.collection(db, 'meals'), firestore.where('userId', '==', user.uid), firestore.orderBy('createdAt', 'desc'), firestore.limit(20));
              const snap = await firestore.getDocs(mealsRef);
              const recent: any[] = [];
              snap.forEach((d: any) => recent.push({ id: d.id, ...(d.data() || {}) }));
              setRecentMeals(recent);
            } catch (e) {
              // ignore
            }
          }
        } catch (error) {
          console.error('Error loading meal preferences:', error);
        }
      }
    };
    loadMealPreferences();
  }, [user]);

  // Handle cooking skill selection
  const handleSkillChange = (skill: CookingSkill) => {
    setCookingSkill(skill);
  };

  // Validate meal preferences
  const validateMealPreferences = () => {
    const errors: string[] = [];

    if (!cookingSkill) {
      errors.push('Please select a cooking skill level');
    }

    if (mealFrequency < 1 || mealFrequency > 8) {
      errors.push('Meal frequency should be between 1 and 8 meals per day');
    }

    return errors;
  };

  // Save meal preferences to Firestore
  const handleSavePreferences = async () => {
    if (!user) return;

    const errors = validateMealPreferences();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setValidationErrors([]);

    try {
      const { db, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(db, 'users', user.uid);

      // Get current nutrition goals and update meal preferences
      const userDocSnap = await firestore.getDoc(userDocRef);
      const currentData = userDocSnap.exists() ? userDocSnap.data() : {};
      const currentNutritionGoals = currentData.nutrition_goals || {};

      const updatedGoals: NutritionGoals = {
        ...currentNutritionGoals,
        preferences: {
          ...currentNutritionGoals.preferences,
          cooking_skill: cookingSkill!,
          meal_frequency: mealFrequency,
          dietary_restrictions: currentNutritionGoals.preferences?.dietary_restrictions || []
        },
        primary_goal: currentNutritionGoals.primary_goal || 'general_health',
        activity_level: currentNutritionGoals.activity_level || 'moderately_active'
      };

      await firestore.updateDoc(userDocRef, {
        nutrition_goals: updatedGoals,
        updated_at: new Date()
      });
      
      setNutritionGoals(updatedGoals);
      onSuccess('Meal preferences saved successfully!');
      setIsEditing(false);
    } catch (error: any) {
      onError(error.message || 'Failed to save meal preferences');
    } finally {
      setLoading(false);
    }
  };

  // Called by modal after it verifies persistence
  function handlePersistedPreferences(saved: { cooking_skill?: any; meal_frequency?: number }) {
    console.groupCollapsed('MealPreferencesSection: handlePersistedPreferences');
    console.log('saved:', saved);
    if (saved.cooking_skill !== undefined) setCookingSkill(saved.cooking_skill);
    if (saved.meal_frequency !== undefined) setMealFrequency(saved.meal_frequency);
    try { document.body.style.overflow = ''; } catch (e) {}
    // Merge saved preferences into the in-memory nutritionGoals so the
    // display reads the updated nested values consistently.
    setNutritionGoals(prev => {
      const merged: NutritionGoals = {
        primary_goal: (prev && prev.primary_goal) || 'general_health',
        activity_level: (prev && prev.activity_level) || 'moderately_active',
        preferences: {
          // ensure required preference fields have sensible defaults
          dietary_restrictions: (prev && prev.preferences && prev.preferences.dietary_restrictions) || [],
          cooking_skill: (saved.cooking_skill !== undefined ? saved.cooking_skill : (prev && prev.preferences && prev.preferences.cooking_skill) || 'beginner') as any,
          meal_frequency: (saved.meal_frequency !== undefined ? saved.meal_frequency : (prev && prev.preferences && prev.preferences.meal_frequency) || 3)
        },
        // preserve optional fields when available
        ...(prev && prev.current_weight !== undefined ? { current_weight: prev.current_weight } : {}),
        ...(prev && prev.target_weight !== undefined ? { target_weight: prev.target_weight } : {}),
        ...(prev && prev.height !== undefined ? { height: prev.height } : {}),
        ...(prev && prev.macro_targets ? { macro_targets: prev.macro_targets } : {})
      };
      return merged;
    });

    onSuccess('Meal preferences saved successfully!');
    setIsEditing(false);
    console.groupEnd();
  }

  // Favorite meals handlers
  const normalize = (s: string) => s.trim().toLowerCase();

  const handleAddFavorite = async () => {
    if (!user) return;
    const name = newFavorite.trim();
    if (!name) return;

    // Prevent duplicate by normalized name
    if (favorites.some(f => normalize(f.name) === normalize(name))) {
      onError('This meal is already in your favorites');
      return;
    }

    // Validate required fields for favorite
    if (!newNutrition.servingSize || newNutrition.calories == null) {
      onError('Please provide a serving size and calories for the favorite');
      return;
    }

    setLoading(true);
    try {
      const fav: FavoriteItem = {
        id: `fav_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        name,
        source: 'manual',
        nutrition: {
          calories: newNutrition.calories,
          protein: newNutrition.protein,
          carbs: newNutrition.carbs,
          fat: newNutrition.fat,
          sodium: (newNutrition as any).sodium,
          sugars: (newNutrition as any).sugars,
          calcium: (newNutrition as any).calcium,
          iron: (newNutrition as any).iron,
          fatCategories: (newNutrition as any).fatCategories,
          vitamins: (newNutrition as any).vitamins,
          otherInfo: (newNutrition as any).otherInfo,
        },
        servingSize: newNutrition.servingSize,
        created_at: Date.now(),
      };

      const updated = await addFavoriteForUser(user.uid, fav);
      setFavorites(updated as FavoriteItem[]);
      setNewFavorite('');
      setNewNutrition({});
      onSuccess('Added to favorites');
    } catch (err: any) {
      onError(err.message || 'Failed to add favorite');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (fav: FavoriteItem) => {
    if (!user) return;
    setLoading(true);
    try {
      const updated = await removeFavoriteForUser(user.uid, fav.id);
      setFavorites(updated as FavoriteItem[]);
      onSuccess('Removed favorite');
    } catch (err: any) {
      onError(err.message || 'Failed to remove favorite');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing and reset to original state
  const handleCancelEdit = () => {
    setIsEditing(false);
    setValidationErrors([]);
    setCookingSkill(nutritionGoals?.preferences?.cooking_skill || null);
    setMealFrequency(nutritionGoals?.preferences?.meal_frequency || 3);
  };

  // Start editing mode
  const handleStartEdit = () => {
    setIsEditing(true);
    setValidationErrors([]);
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="header-with-tooltip">
          <h2>Meal Preferences</h2>
          <Tooltip content="Customize your meal planning by setting your cooking experience level and preferred daily meal frequency." />
        </div>
        {!isEditing && (
          <button 
            className="edit-section-button" 
            onClick={handleStartEdit}
            title="Edit meal preferences"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="profile-card">
        {/* Meal Preferences Modal */}
        <MealPreferencesModal
          isOpen={isEditing}
          onClose={handleCancelEdit}
          onSave={handleSavePreferences}
          onPersisted={handlePersistedPreferences}
          user={user}
          loading={loading}
          validationErrors={validationErrors}
          cookingSkill={cookingSkill}
          mealFrequency={mealFrequency}
          onSkillChange={handleSkillChange}
          onMealFrequencyChange={setMealFrequency}
        />

        {!isEditing && (
          <div className="meal-preferences-display">
            {(cookingSkill || nutritionGoals?.preferences?.meal_frequency) ? (
              <div 
                className="preferences-summary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div 
                  className="preferences-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem'
                  }}
                >
                  {/* Cooking Skill Card */}
                  {cookingSkill && (
                    <div 
                      className="preference-card cooking-skill"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.5rem',
                        background: 'rgba(26, 26, 46, 0.6)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div 
                        className="preference-icon"
                        style={{
                          fontSize: '2rem',
                          width: '3rem',
                          height: '3rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(245, 158, 11, 0.1)',
                          borderRadius: '50%',
                          border: '2px solid rgba(245, 158, 11, 0.3)',
                          flexShrink: '0'
                        }}
                      >
                        {cookingSkill === 'beginner' && '👶'}
                        {cookingSkill === 'intermediate' && '👨‍🍳'}
                        {cookingSkill === 'advanced' && '👨‍💼'}
                      </div>
                      <div 
                        className="preference-info"
                        style={{ flex: '1' }}
                      >
                        <h3 
                          style={{
                            color: '#e2e8f0',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            margin: '0 0 0.25rem 0'
                          }}
                        >
                          Cooking Skill
                        </h3>
                        <p 
                          style={{
                            color: '#94a3b8',
                            fontSize: '0.95rem',
                            margin: '0',
                            fontWeight: '500'
                          }}
                        >
                          {COOKING_SKILLS.find(s => s.id === cookingSkill)?.label}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Meal Frequency Card */}
                  {nutritionGoals?.preferences?.meal_frequency && (
                    <div 
                      className="preference-card meal-frequency"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.5rem',
                        background: 'rgba(26, 26, 46, 0.6)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div 
                        className="preference-icon"
                        style={{
                          fontSize: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(139, 92, 246, 0.1)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          border: '2px solid rgba(139, 92, 246, 0.3)',
                          flexShrink: '0',
                          minWidth: '3rem'
                        }}
                      >
                        {'🍽️'}
                      </div>
                      <div 
                        className="preference-info"
                        style={{ flex: '1' }}
                      >
                        <h3 
                          style={{
                            color: '#e2e8f0',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            margin: '0 0 0.25rem 0'
                          }}
                        >
                          Meal Frequency
                        </h3>
                        <p 
                          style={{
                            color: '#94a3b8',
                            fontSize: '0.95rem',
                            margin: '0',
                            fontWeight: '500'
                          }}
                        >
                          {nutritionGoals?.preferences?.meal_frequency === 1 ? `${nutritionGoals.preferences?.meal_frequency} meal per day` : `${nutritionGoals?.preferences?.meal_frequency} meals per day`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {/* Favorite Meals Section */}
                <div className="favorites-section" style={{ marginTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>Add Your Favorite Meals</h3>
                  <div className="meal-form" style={{ marginBottom: '0.5rem' }}>
                    <div className="form-grid">
                      <div className="form-field required">
                        <label>Favorite meal name</label>
                        <input
                          required
                          aria-required="true"
                          type="text"
                          value={newFavorite}
                          onChange={(e) => setNewFavorite(e.target.value)}
                          placeholder="e.g. Caesar Salad"
                          disabled={loading}
                        />
                      </div>
                      <div className="form-field required">
                        <label>Serving Size</label>
                        <input
                          required
                          aria-required="true"
                          type="text"
                          placeholder="e.g. 1 bowl"
                          value={newNutrition.servingSize ?? ''}
                          onChange={(e) => setNewNutrition(prev => ({ ...prev, servingSize: e.target.value || undefined }))}
                        />
                      </div>
                      <div className="form-field required">
                        <label>Calories</label>
                        <input required type="number" placeholder="cal" value={newNutrition.calories ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, calories: e.target.value ? Number(e.target.value) : undefined }))} aria-required="true" />
                      </div>
                      {/* other nutrition fields moved to optional section */}
                    </div>

                    <div className="form-toggle-row">
                      <button
                        type="button"
                        className="form-toggle"
                        aria-expanded={showFavOptional}
                        aria-controls="favorite-optional-fields"
                        onClick={() => setShowFavOptional((v) => !v)}
                      >
                        <span className={`chev ${showFavOptional ? 'open' : ''}`}>▾</span>
                        {showFavOptional ? 'Hide optional nutrition' : 'Show more nutrition values'}
                      </button>
                    </div>

                    {showFavOptional && (
                      <div className="form-grid" id="favorite-optional-fields" style={{ marginTop: 4 }}>
                        <div className="form-field">
                          <label>Protein (g)</label>
                          <input type="number" placeholder="protein" value={(newNutrition as any).protein ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, protein: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Total Carbs (g)</label>
                          <input type="number" placeholder="carbs" value={(newNutrition as any).carbs ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, carbs: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Total Fat (g)</label>
                          <input type="number" placeholder="fat" value={(newNutrition as any).fat ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, fat: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Sodium (mg)</label>
                          <input type="number" placeholder="sodium" value={(newNutrition as any).sodium ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, sodium: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Sugars (g)</label>
                          <input type="number" placeholder="sugars" value={(newNutrition as any).sugars ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, sugars: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Calcium (mg)</label>
                          <input type="number" placeholder="calcium" value={(newNutrition as any).calcium ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, calcium: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Iron (mg)</label>
                          <input type="number" placeholder="iron" value={(newNutrition as any).iron ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, iron: e.target.value ? Number(e.target.value) : undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Fat Categories</label>
                          <input type="text" placeholder="e.g. saturated, unsaturated" value={(newNutrition as any).fatCategories ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, fatCategories: e.target.value || undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Vitamins</label>
                          <input type="text" placeholder="e.g. Vit A, C" value={(newNutrition as any).vitamins ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, vitamins: e.target.value || undefined }))} />
                        </div>
                        <div className="form-field">
                          <label>Other Info</label>
                          <input type="text" placeholder="Notes" value={(newNutrition as any).otherInfo ?? ''} onChange={(e) => setNewNutrition(prev => ({ ...prev, otherInfo: e.target.value || undefined }))} />
                        </div>
                      </div>
                    )}

                    <div className="form-actions" style={{ marginTop: 6 }}>
                      <button className="response-button small" type="button" onClick={() => { setNewFavorite(''); setNewNutrition({}); setShowFavOptional(false); }} style={{ marginRight: 8 }}>Clear</button>
                      <button className="response-button small" onClick={handleAddFavorite} disabled={loading || !newFavorite.trim() || !newNutrition.servingSize || newNutrition.calories == null}>Add</button>
                    </div>
                  </div>

                  {/* Quick-add from recent meals */}
                  {recentMeals.length > 0 && (
                    <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select style={{ flex: 1, padding: '0.5rem', borderRadius: 6 }} id="recentMealSelect">
                        <option value="">Add from your recent meals...</option>
                        {recentMeals.map((m) => (
                          <option key={m.id} value={m.id}>{`${m.name} — ${m.servingSize || ''} • ${Math.round(m.calories || 0)} cal`}</option>
                        ))}
                      </select>
                      <button className="response-button small" onClick={async () => {
                        const sel = (document.getElementById('recentMealSelect') as HTMLSelectElement).value;
                        if (!sel) return;
                        const chosen = recentMeals.find(r => r.id === sel);
                        if (!chosen) return;
                        // Build favorite from meal
                        const fav: FavoriteItem = {
                          id: `fav_meal_${chosen.id}`,
                          name: chosen.name,
                          source: 'meal',
                          nutrition: {
                            calories: chosen.calories,
                            protein: chosen.protein,
                            carbs: chosen.totalCarbs ?? chosen.carbs,
                            fat: chosen.totalFat ?? chosen.fat,
                            sodium: chosen.sodium,
                            sugars: chosen.sugars,
                            calcium: chosen.calcium,
                            iron: chosen.iron,
                            fatCategories: chosen.fatCategories,
                            vitamins: chosen.vitamins,
                            otherInfo: chosen.otherInfo,
                            // do not store servingsHad on favorites
                          },
                          servingSize: chosen.servingSize,
                          created_at: Date.now(),
                        };
                        try {
                          setLoading(true);
                          const updated = await addFavoriteForUser(user!.uid, fav);
                          setFavorites(updated as FavoriteItem[]);
                          onSuccess('Added meal to favorites');
                        } catch (err: any) {
                          onError(err.message || 'Failed to add favorite');
                        } finally { setLoading(false); }
                      }}>Add</button>
                    </div>
                  )}

                  {favorites.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {favorites.map((fav) => (
                        <div key={fav.id} className="preference-card favorite-item" onClick={() => {
                          const mealLike = {
                            id: fav.id,
                            userId: user?.uid || 'me',
                            name: fav.name,
                            calories: fav.nutrition?.calories ?? 0,
                            servingSize: fav.servingSize || '',
                            // leave servingsHad undefined so Add-a-Meal prompts user to enter it
                            totalCarbs: fav.nutrition?.carbs,
                            totalFat: fav.nutrition?.fat,
                            protein: fav.nutrition?.protein,
                            sodium: fav.nutrition?.sodium,
                            sugars: fav.nutrition?.sugars,
                            calcium: fav.nutrition?.calcium,
                            iron: fav.nutrition?.iron,
                            createdAt: fav.created_at || Date.now(),
                            otherInfo: ''
                          };
                          setSelectedFavMeal(mealLike);
                          setFavModalOpen(true);
                        }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem', background: 'rgba(26, 26, 46, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', cursor: 'pointer' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ fontSize: '1.6rem', width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.12)', flexShrink: 0 }}>
                              {'🍽️'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{fav.name}</span>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {fav.servingSize && <small style={{ color: '#94a3b8' }}>{fav.servingSize}</small>}
                                {fav.nutrition && <small style={{ color: '#94a3b8' }}>{`${fav.nutrition.calories ?? '-'} cal • ${fav.nutrition.protein ?? '-'}g protein • ${fav.nutrition.carbs ?? '-'}g carbs • ${fav.nutrition.fat ?? '-'}g fat`}</small>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(fav); }} className="remove-favorite-button">Remove</button>
                          </div>
                        </div>
                      ))}
                      <MealDetailsModal
                        isOpen={favModalOpen}
                        onClose={() => setFavModalOpen(false)}
                        meal={selectedFavMeal}
                        onSaveExternal={async (mealId, updates) => {
                          if (!user || !mealId) throw new Error('User not found');
                          // Map meal updates to favorite structure
                          const partial: any = {};
                          if (updates.name !== undefined) partial.name = updates.name;
                          if (updates.servingSize !== undefined) partial.servingSize = updates.servingSize;
                          // Map nutrition fields: calories, protein, totalCarbs -> carbs, totalFat -> fat, sodium, sugars, calcium, iron
                          partial.nutrition = {};
                          if (updates.calories !== undefined) partial.nutrition.calories = updates.calories;
                          if (updates.protein !== undefined) partial.nutrition.protein = updates.protein;
                          if (updates.totalCarbs !== undefined) partial.nutrition.carbs = updates.totalCarbs;
                          if (updates.totalFat !== undefined) partial.nutrition.fat = updates.totalFat;
                          if (updates.sodium !== undefined) partial.nutrition.sodium = updates.sodium;
                          if (updates.sugars !== undefined) partial.nutrition.sugars = updates.sugars;
                          if (updates.calcium !== undefined) partial.nutrition.calcium = updates.calcium;
                          if (updates.iron !== undefined) partial.nutrition.iron = updates.iron;

                          // Persist update to user's favorites
                          const updated = await updateFavoriteForUser(user.uid, mealId, partial);
                          // Update local UI state
                          setFavorites(updated as any);
                          setFavModalOpen(false);
                        }}
                      />
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: '#94a3b8' }}>No favorite meals yet. Add one above.</p>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="no-preferences-set"
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#94a3b8',
                  fontSize: '1rem'
                }}
              >
                <p style={{ margin: '0' }}>No meal preferences set yet. Click "Edit" to get started!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPreferencesSection;
