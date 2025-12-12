import React, { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../lib/resolveFirebase';
import type { FavoriteItem } from '../../types/favorite';
import { getFavoritesForUser, addFavoriteForUser, removeFavoriteForUser, updateFavoriteForUser } from '../services/favoritesService';
import MealDetailsModal from '../features/modals/MealDetailsModal';
import { Tooltip } from '../ui';

interface FavoriteFoodsSectionProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const FavoriteFoodsSection: React.FC<FavoriteFoodsSectionProps> = ({ 
  user, 
  onSuccess, 
  onError 
}) => {
  const [loading, setLoading] = useState(false);
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
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [showFavOptional, setShowFavOptional] = useState(false);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  const [selectedFavMeal, setSelectedFavMeal] = useState<any | null>(null);
  const [favModalOpen, setFavModalOpen] = useState(false);

  // Load existing favorites from Firestore
  useEffect(() => {
    const loadFavorites = async () => {
      if (user) {
        try {
          const { db, firestore } = await resolveFirebase();
          const userDocRef = firestore.doc(db, 'users', user.uid);
          const userDocSnap = await firestore.getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
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
          console.error('Error loading favorites:', error);
        }
      }
    };
    loadFavorites();
  }, [user]);

  const normalize = (s: string) => s.trim().toLowerCase();

  // Basic validator for favorites input fields
  const validateFavoriteInput = () => {
    const name = newFavorite?.trim();
    if (!name) return 'Please enter a favorite meal name';
    if (name.length > 200) return 'Favorite name is too long';

    const servingSize = newNutrition.servingSize?.trim();
    if (!servingSize) return 'Please provide a serving size';
    if (servingSize.length > 200) return 'Serving size is too long';

    const numFields: Array<{ key: keyof typeof newNutrition; label: string }> = [
      { key: 'calories', label: 'Calories' },
      { key: 'protein', label: 'Protein' },
      { key: 'carbs', label: 'Carbs' },
      { key: 'fat', label: 'Fat' },
      { key: 'sodium', label: 'Sodium' },
      { key: 'sugars', label: 'Sugars' },
      { key: 'calcium', label: 'Calcium' },
      { key: 'iron', label: 'Iron' },
    ];

    for (const { key, label } of numFields) {
      const val = newNutrition[key];
      if (val == null) continue; // optional
      if (Number.isNaN(val)) return `${label} must be a number`;
      if (typeof val !== 'number') return `${label} must be a number`;
      if (val < 0) return `${label} cannot be negative`;
      if (!Number.isFinite(val)) return `${label} must be a finite number`;
      // Soft upper bounds to catch obvious mistakes
      if ((key === 'calories' && val > 5000) || (key !== 'calories' && val > 10000)) {
        return `${label} value seems too large`;
      }
    }

    return null;
  };

  const handleAddFavorite = async () => {
    if (!user) return;
    const name = newFavorite.trim();
    if (!name) return;

    // Prevent duplicate by normalized name
    if (favorites.some(f => normalize(f.name) === normalize(name))) {
      onError('This meal is already in your favorites');
      return;
    }

    // Validate inputs for favorite
    const err = validateFavoriteInput();
    if (err) {
      setFormErrors(err);
      onError(err);
      return;
    }

    setLoading(true);
    try {
      const nutrition: any = {};
      if (newNutrition.calories != null) nutrition.calories = newNutrition.calories;
      if (newNutrition.protein != null) nutrition.protein = newNutrition.protein;
      if (newNutrition.carbs != null) nutrition.carbs = newNutrition.carbs;
      if (newNutrition.fat != null) nutrition.fat = newNutrition.fat;
      if ((newNutrition as any).sodium != null) nutrition.sodium = (newNutrition as any).sodium;
      if ((newNutrition as any).sugars != null) nutrition.sugars = (newNutrition as any).sugars;
      if ((newNutrition as any).calcium != null) nutrition.calcium = (newNutrition as any).calcium;
      if ((newNutrition as any).iron != null) nutrition.iron = (newNutrition as any).iron;
      if ((newNutrition as any).fatCategories) nutrition.fatCategories = (newNutrition as any).fatCategories;
      if ((newNutrition as any).vitamins) nutrition.vitamins = (newNutrition as any).vitamins;
      if ((newNutrition as any).otherInfo) nutrition.otherInfo = (newNutrition as any).otherInfo;

      const fav: FavoriteItem = {
        id: `fav_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        name,
        source: 'manual',
        nutrition,
        servingSize: newNutrition.servingSize!,
        created_at: Date.now(),
      };

      const updated = await addFavoriteForUser(user.uid, fav);
      setFavorites(updated as FavoriteItem[]);
      setNewFavorite('');
      setNewNutrition({});
      setFormErrors(null);
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

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="header-with-tooltip">
          <h2>Favorite Foods</h2>
          <Tooltip content="Save your frequently eaten meals for quick access when tracking nutrition." />
        </div>
      </div>

      <div className="profile-card">
        <div className="favorites-section">
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
                const nutrition: any = {};
                if (chosen.calories != null) nutrition.calories = chosen.calories;
                if (chosen.protein != null) nutrition.protein = chosen.protein;
                if ((chosen.totalCarbs ?? chosen.carbs) != null) nutrition.carbs = chosen.totalCarbs ?? chosen.carbs;
                if ((chosen.totalFat ?? chosen.fat) != null) nutrition.fat = chosen.totalFat ?? chosen.fat;
                if (chosen.sodium != null) nutrition.sodium = chosen.sodium;
                if (chosen.sugars != null) nutrition.sugars = chosen.sugars;
                if (chosen.calcium != null) nutrition.calcium = chosen.calcium;
                if (chosen.iron != null) nutrition.iron = chosen.iron;
                if (chosen.fatCategories) nutrition.fatCategories = chosen.fatCategories;
                if (chosen.vitamins) nutrition.vitamins = chosen.vitamins;
                if (chosen.otherInfo) nutrition.otherInfo = chosen.otherInfo;

                const fav: FavoriteItem = {
                  id: `fav_meal_${chosen.id}`,
                  name: chosen.name,
                  source: 'meal',
                  nutrition,
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '45vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {favorites.sort((a, b) => a.name.localeCompare(b.name)).map((fav) => (
                <div key={fav.id} className="preference-card favorite-item" onClick={() => {
                  const mealLike = {
                    id: fav.id,
                    userId: user?.uid || 'me',
                    name: fav.name,
                    calories: fav.nutrition?.calories ?? 0,
                    servingSize: fav.servingSize || '',
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
                  try {
                    if (!user || !mealId) throw new Error('User not found');
                    
                    const partial: any = {};
                      if (updates.name !== undefined) {
                        const n = String(updates.name || '').trim();
                        if (!n) throw new Error('Favorite name cannot be empty');
                        if (n.length > 200) throw new Error('Favorite name is too long');
                        partial.name = n;
                      }
                      if (updates.servingSize !== undefined) {
                        const s = String(updates.servingSize || '').trim();
                        if (!s) throw new Error('Serving size cannot be empty');
                        if (s.length > 200) throw new Error('Serving size is too long');
                        partial.servingSize = s;
                      }
                    
                    partial.nutrition = {};
                      const ensureNum = (val: any, label: string) => {
                        if (val === undefined) return undefined;
                        const num = Number(val);
                        if (!Number.isFinite(num) || num < 0) throw new Error(`${label} must be a non-negative number`);
                        return num;
                      };
                      const cals = ensureNum(updates.calories, 'Calories');
                      if (cals !== undefined) partial.nutrition.calories = cals;
                      const prot = ensureNum(updates.protein, 'Protein');
                      if (prot !== undefined) partial.nutrition.protein = prot;
                      const carbs = ensureNum(updates.totalCarbs, 'Carbs');
                      if (carbs !== undefined) partial.nutrition.carbs = carbs;
                      const fat = ensureNum(updates.totalFat, 'Fat');
                      if (fat !== undefined) partial.nutrition.fat = fat;
                      const sod = ensureNum(updates.sodium, 'Sodium');
                      if (sod !== undefined) partial.nutrition.sodium = sod;
                      const sug = ensureNum(updates.sugars, 'Sugars');
                      if (sug !== undefined) partial.nutrition.sugars = sug;
                      const cal = ensureNum(updates.calcium, 'Calcium');
                      if (cal !== undefined) partial.nutrition.calcium = cal;
                      const ir = ensureNum(updates.iron, 'Iron');
                      if (ir !== undefined) partial.nutrition.iron = ir;
                    if (updates.fatCategories !== undefined) partial.nutrition.fatCategories = updates.fatCategories;
                    if (updates.vitamins !== undefined) partial.nutrition.vitamins = updates.vitamins;
                    if (updates.otherInfo !== undefined) partial.nutrition.otherInfo = updates.otherInfo;

                    const updated = await updateFavoriteForUser(user.uid, mealId, partial);
                    setFavorites(updated as any);
                    
                    try {
                      const { db, firestore } = await resolveFirebase();
                      const mealsQuery = firestore.query(
                        firestore.collection(db, 'meals'),
                        firestore.where('userId', '==', user.uid),
                        firestore.where('name', '==', selectedFavMeal?.name || '')
                      );
                      const mealsSnap = await firestore.getDocs(mealsQuery);
                      
                      if (!mealsSnap.empty) {
                        const mealUpdates: any = {
                          name: updates.name,
                          servingSize: updates.servingSize,
                          calories: updates.calories,
                          totalCarbs: updates.totalCarbs,
                          totalFat: updates.totalFat,
                          protein: updates.protein,
                          sodium: updates.sodium,
                          sugars: updates.sugars,
                          calcium: updates.calcium,
                          iron: updates.iron,
                          fatCategories: updates.fatCategories,
                          vitamins: updates.vitamins,
                          otherInfo: updates.otherInfo,
                        };
                        
                        for (const doc of mealsSnap.docs) {
                          await firestore.updateDoc(doc.ref, mealUpdates);
                        }
                      }
                    } catch (mealErr) {
                      console.warn('Could not update meals when favorite changed:', mealErr);
                    }
                    
                    onSuccess('Favorite updated successfully');
                    setFavModalOpen(false);
                  } catch (err: any) {
                    console.error('Failed to update favorite:', err);
                    onError(err.message || 'Failed to update favorite');
                    throw err;
                  }
                }}
              />
            </div>
          ) : (
            <p style={{ margin: 0, color: '#94a3b8' }}>No favorite foods yet. Add one above.</p>
          )}
        </div>
      </div>

      {formErrors && (
        <div role="alert" style={{ marginTop: '0.5rem', color: '#fca5a5', fontSize: '0.9rem' }}>{formErrors}</div>
      )}
    </div>
  );
};

export default FavoriteFoodsSection;
