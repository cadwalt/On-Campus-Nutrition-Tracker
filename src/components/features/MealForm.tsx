/**
 * MealForm Component
 * 
 * Main form for adding/editing meal entries with nutrition tracking.
 * Implements security, accessibility, and reliability best practices:
 * - Input validation & sanitization
 * - ARIA attributes & keyboard navigation
 * - Defensive parsing & error handling
 * 
 * Architecture:
 * - Form state management with validation
 * - Favorites integration with search
 * - Lazy Firebase loading for performance
 * - Comprehensive error handling and user feedback
 */

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

// Lazy-load Firebase to avoid bundling auth in initial chunk (Performance & Security)
const resolveFirebase = async () => {
  const mod: any = await import("../../firebase");
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import("firebase/firestore");
  const firebaseAuth = await import("firebase/auth");
  return { db, firestore, firebaseAuth };
};
import type { Meal } from "../../types/meal";
import Toast from "../ui/Toast";
import type { FavoriteItem } from "../../types/favorite";
import { getFavoritesForUser } from "../services/favoritesService";
import { validateMeal, MEAL_CONSTRAINTS, sanitizeMeal, parseNumber } from "../../utils/mealValidation";
import {
  SUGGESTION_ITEM_STYLE,
  SUGGESTION_PANEL_STYLE,
  SUGGESTION_PLUS_BUTTON_STYLE,
  SUGGESTION_NAME_STYLE,
  SUGGESTION_MAIN_TEXT_STYLE,
  SUGGESTION_SECONDARY_TEXT_STYLE,
  FORM_ACTIONS_STYLE,
  BUTTON_GROUP_STYLE,
  MODAL_BODY_STYLE,
  SEARCH_INPUT_STYLE,
  FAVORITES_LIST_BUTTON_STYLE,
  FAVORITES_LIST_NAME_STYLE,
  FAVORITES_LIST_META_STYLE,
  FAVORITES_LIST_EMPTY_STYLE,
  CLEAR_BUTTON_STYLE,
} from "./styles/mealFormStyles";

/**
 * Props for MealForm component
 * @param onMealAdded - Callback when meal is successfully added
 * @param initialMeal - Pre-populate form with existing meal data
 * @param onInitialMealSet - Callback when initial data is loaded
 * @param planningMode - If true, don't save to database, only call onMealAdded
 */
interface MealFormProps {
  onMealAdded: (meal: Meal) => void;
  initialMeal?: Meal | null;
  onInitialMealSet?: () => void;
  planningMode?: boolean;
}

/**
 * Default form state - all fields as strings for easier input control
 */
const DEFAULT_FORM_STATE = {
  name: "",
  calories: "",
  servingSize: "",
  servingsHad: "",
  totalCarbs: "",
  totalFat: "",
  protein: "",
  fatCategories: "",
  sodium: "",
  sugars: "",
  calcium: "",
  vitamins: "",
  iron: "",
  otherInfo: "",
};

/**
 * Populate form from meal data defensively
 * Uses optional chaining and nullish coalescing to handle missing/incomplete data
 */
const populateFormFromMeal = (meal: Meal | null | undefined) => {
  if (!meal) return DEFAULT_FORM_STATE;
  
  return {
    name: meal?.name ?? "",
    calories: meal?.calories != null ? String(meal?.calories) : "",
    servingSize: meal?.servingSize ?? "",
    servingsHad: meal?.servingsHad != null ? String(meal?.servingsHad) : "",
    totalCarbs: meal?.totalCarbs != null ? String(meal?.totalCarbs) : "",
    totalFat: meal?.totalFat != null ? String(meal?.totalFat) : "",
    protein: meal?.protein != null ? String(meal?.protein) : "",
    fatCategories: meal?.fatCategories ?? "",
    sodium: meal?.sodium != null ? String(meal?.sodium) : "",
    sugars: meal?.sugars != null ? String(meal?.sugars) : "",
    calcium: meal?.calcium != null ? String(meal?.calcium) : "",
    vitamins: meal?.vitamins ?? "",
    iron: meal?.iron != null ? String(meal?.iron) : "",
    otherInfo: meal?.otherInfo ?? "",
  };
};

const MealForm: React.FC<MealFormProps> = ({ onMealAdded, initialMeal, onInitialMealSet, planningMode = false }) => {
  // ─────────────────────────────────────────────────────────────────
  // STATE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────
  
  // Form fields: All stored as strings for easier input control
  // Numbers are parsed/validated only on submit to avoid blocking user typing
  const [form, setForm] = useState(populateFormFromMeal(initialMeal));

  // UI state for notifications and error display
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<{ field?: string; message: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({
    message: "",
    type: "success",
    visible: false,
  });

  // UI state for collapsible sections and modals
  const [showOptional, setShowOptional] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteItem[] | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [favoritesSearch, setFavoritesSearch] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // INITIALIZATION & SIDE EFFECTS
  // ─────────────────────────────────────────────────────────────────

  // Initialize form with meal data on mount or when initialMeal changes
  useEffect(() => {
    if (initialMeal) {
      setForm(populateFormFromMeal(initialMeal));
      if (onInitialMealSet) {
        onInitialMealSet();
      }
    }
  }, [initialMeal, onInitialMealSet]);

  // ─────────────────────────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────

  // Get current authenticated user from Firebase
  // Lazy loads auth library only when needed
  const getCurrentUser = async () => {
    const { firebaseAuth } = await resolveFirebase();
    return firebaseAuth.getAuth ? firebaseAuth.getAuth().currentUser : null;
  };

  // User feedback helpers
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
  };

  const closeToast = () => setToast((t) => ({ ...t, visible: false }));

  // Update form field and clear any field-specific errors
  // Provides immediate feedback as user corrects validation errors
  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formError && formError.field === field) {
      setFormError(null);
    }
  };

  // Reset form to empty state
  const resetForm = () => {
    setForm(DEFAULT_FORM_STATE);
    setShowOptional(false);
  };

  // List of required fields for quick validation
  const requiredMissing = () => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Name");
    if (!form.servingSize.trim()) missing.push("Serving Size");
    if (!form.calories.trim()) missing.push("Calories");
    return missing;
  };

  /**
   * Load meal history from Firestore for the current user
   * Used both on mount and after saving a new meal to keep predictive search updated
   */
  const loadMealHistory = async (mounted: boolean = true) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        if (mounted) setMeals([]);
        return;
      }

      // Ensuring that the database only returns records belonging to the authenticated user
      const { db, firestore } = await resolveFirebase();
      const q = firestore.query(
        firestore.collection(db, "meals"),
        firestore.where("userId", "==", user.uid)
      );
      const snapshot = await firestore.getDocs(q);
      const mealsList: Meal[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        mealsList.push({ id: doc.id, ...data } as Meal);
      });
      if (mounted) setMeals(mealsList);
    } catch (e) {
      console.error("Failed to load meals", e);
      if (mounted) setMeals([]);
    }
  };

  /**
   * Build meal object from form data for database storage
   * Handles type conversion, sanitization, and optional field inclusion
   */
  const buildMealObject = (userId: string, sanitizedForm: typeof form): Meal => {
    // Base required fields
    const mealBase: Meal = {
      userId,
      name: sanitizedForm.name.trim(),
      calories: Number(sanitizedForm.calories),
      servingSize: sanitizedForm.servingSize.trim(),
      createdAt: Date.now(),
    };

    // Add optional numeric fields if they have valid values
    const numericOptional: Record<string, string> = {
      servingsHad: sanitizedForm.servingsHad,
      totalCarbs: sanitizedForm.totalCarbs,
      totalFat: sanitizedForm.totalFat,
      protein: sanitizedForm.protein,
      sodium: sanitizedForm.sodium,
      sugars: sanitizedForm.sugars,
      calcium: sanitizedForm.calcium,
      iron: sanitizedForm.iron,
    };

    Object.entries(numericOptional).forEach(([key, raw]) => {
      const parsed = parseNumber(raw);
      if (typeof parsed === "number") {
        // @ts-expect-error dynamic assignment of optional field
        mealBase[key] = parsed;
      }
    });

    // Add optional string fields if they have non-empty values
    const stringOptional: Record<string, string> = {
      fatCategories: sanitizedForm.fatCategories,
      vitamins: sanitizedForm.vitamins,
      otherInfo: sanitizedForm.otherInfo,
    };

    Object.entries(stringOptional).forEach(([key, raw]) => {
      const trimmed = raw.trim();
      if (trimmed) {
        // @ts-expect-error dynamic assignment of optional field
        mealBase[key] = trimmed;
      }
    });

    return mealBase;
  };

  // ─────────────────────────────────────────────────────────────────
  // SIDE EFFECTS & DATA LOADING
  // ─────────────────────────────────────────────────────────────────

  // Load user's favorite meals and meal history on component mount
  // Uses cleanup function to prevent memory leaks from stale state updates
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          if (mounted) {
            setFavorites([]);
            setMeals([]);
          }
          return;
        }

        // Load favorites
        const favs = await getFavoritesForUser(user.uid);
        const sortedFavs = (favs || []).slice().sort((a: FavoriteItem, b: FavoriteItem) => (a.name || "").localeCompare(b.name || ""));
        if (mounted) setFavorites(sortedFavs);

        // Load meal history from firestore
        await loadMealHistory(mounted);
      } catch (e) {
        console.error("Failed to load favorites or meals", e);
        if (mounted) {
          setFavorites([]);
          setMeals([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // MEMOIZED SELECTORS & COMPUTATIONS
  // ─────────────────────────────────────────────────────────────────

  // Filter favorites by search term and sort alphabetically
  const filteredFavorites = useMemo(() => {
    if (!favorites) return [];
    const base: FavoriteItem[] = favorites;
    const filtered = favoritesSearch ? base.filter((f) => (f.name || "").toLowerCase().includes(favoritesSearch)) : base;
    return filtered.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [favorites, favoritesSearch]);

  // Get meal name suggestions from favorites and meal history
  // Prioritizes favorites, then adds meal names from history
  const nameSuggestions = useMemo(() => {
    const term = form.name.trim().toLowerCase();
    const allItems: (FavoriteItem & { isFavorite: boolean; mealData?: Meal })[] = [];

    if (!favorites || (favorites.length === 0 && meals.length === 0)) {
      return [] as (FavoriteItem & { isFavorite: boolean; mealData?: Meal })[];
    }

    // Add favorites with priority flag
    if (favorites) {
      favorites.forEach((f) => {
        allItems.push({ ...f, isFavorite: true });
      });
    }

    // Add unique meal names from history (deduplicate by normalized name)
    const favoriteNames = new Set(favorites?.map((f) => (f.name || "").toLowerCase().trim()) || []);
    const mealNames = new Set<string>();
    if (meals) {
      meals.forEach((m) => {
        const normalizedName = (m.name || "").toLowerCase().trim();
        // Only add if not already in favorites and not already added
        if (!favoriteNames.has(normalizedName) && !mealNames.has(normalizedName)) {
          mealNames.add(normalizedName);
          allItems.push({
            id: `meal_${m.id}`,
            name: m.name,
            source: "meal" as const,
            created_at: Date.now(),
            isFavorite: false,
            mealData: m, // Include the full meal data for auto-population
          });
        }
      });
    }

    // If no search term, show favorites first, then recent meals (up to 6 total)
    if (!term) {
      const favOnly = allItems.filter((i) => i.isFavorite).slice(0, 6);
      if (favOnly.length < 6) {
        const remaining = allItems.filter((i) => !i.isFavorite).slice(0, 6 - favOnly.length);
        return favOnly.concat(remaining);
      }
      return favOnly;
    }

    // Filter by search term
    const matches = allItems.filter((item) => {
      const name = (item.name || "").toLowerCase();
      return name.includes(term);
    });

    // Sort: favorites first, then alphabetically
    return matches
      .sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) {
          return a.isFavorite ? -1 : 1; // Favorites first
        }
        return (a.name || "").localeCompare(b.name || "");
      })
      .slice(0, 6);
  }, [favorites, meals, form.name]);

  // ─────────────────────────────────────────────────────────────────
  // FORM SUBMISSION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Main form submission handler
   * Multi-layer validation: authentication → required fields → constraints → database save
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Require authentication before any write operation
    const user = await getCurrentUser();
    if (!user) {
      showToast("You must be signed in to save meals", "error");
      return;
    }

    // 2. Check required fields first (fast validation)
    const missing = requiredMissing();
    if (missing.length) {
      showToast(`Missing: ${missing.join(", ")}`, "error");
      return;
    }

    // 3. Sanitize & validate using centralized validation utility (DRY principle)
    // Ensures consistent validation across all components
    const sanitizedForm = sanitizeMeal(form);
    const validationError = validateMeal(sanitizedForm);
    if (validationError) {
      setFormError({ message: validationError.message });
      showToast(validationError.message, "error");
      return;
    }

    // 4. Build meal object and save to database
    setSubmitting(true);
    try {
      const meal = buildMealObject(user.uid, sanitizedForm);
      const { db, firestore } = await resolveFirebase();

      if (planningMode) {
        // Planning mode: only call callback, don't save to database
        showToast("Meal prepared for planning!", "success");
        onMealAdded(meal);
      } else {
        // Normal mode: save to Firestore
        const ref = await firestore.addDoc(firestore.collection(db, "meals"), meal);
        console.debug("[MealForm] Added meal", { id: ref.id, meal });
        const added: Meal = { ...meal, id: ref.id };
        onMealAdded(added);
        showToast("Meal saved", "success");

        // Reload meal history so it appears immediately in predictive search
        // This ensures just-entered meals are available for suggestions without page refresh
        await loadMealHistory(true);
      }

      // Clear form after successful save
      resetForm();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save meal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Apply favorite or meal data to form with defensive null checks
  const applyFavoriteToForm = (item: FavoriteItem & { isFavorite?: boolean; mealData?: Meal }) => {
    // If it's from meal history, populate from the meal data
    if (item.mealData) {
      setForm(populateFormFromMeal(item.mealData));
    } else {
      // It's a favorite, populate from favorite data
      setForm((prev) => ({
        ...prev,
        name: item.name || prev.name,
        calories: item.nutrition?.calories != null ? String(item.nutrition.calories) : prev.calories,
        servingSize: item.servingSize != null ? item.servingSize : prev.servingSize,
        totalCarbs: item.nutrition?.carbs != null ? String(item.nutrition.carbs) : prev.totalCarbs,
        totalFat: item.nutrition?.fat != null ? String(item.nutrition.fat) : prev.totalFat,
        protein: item.nutrition?.protein != null ? String(item.nutrition.protein) : prev.protein,
        sodium: item.nutrition?.sodium != null ? String(item.nutrition.sodium) : prev.sodium,
        sugars: item.nutrition?.sugars != null ? String(item.nutrition.sugars) : prev.sugars,
        calcium: item.nutrition?.calcium != null ? String(item.nutrition.calcium) : prev.calcium,
        iron: item.nutrition?.iron != null ? String(item.nutrition.iron) : prev.iron,
        fatCategories: item.nutrition?.fatCategories != null ? String(item.nutrition.fatCategories) : prev.fatCategories,
        vitamins: item.nutrition?.vitamins != null ? String(item.nutrition.vitamins) : prev.vitamins,
        otherInfo: item.nutrition?.otherInfo != null ? String(item.nutrition.otherInfo) : prev.otherInfo,
      }));
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <>
      <form className="meal-form" onSubmit={handleSubmit} autoComplete="off">
        {/* Required fields */}
        <div className="form-grid" style={{ overflow: "visible" }}>
          <div className="form-field required" style={{ position: "relative", overflow: "visible" }}>
            <label htmlFor="meal-name">Meal Name</label>
            <input
              id="meal-name"
              value={form.name}
              maxLength={MEAL_CONSTRAINTS.MAX_NAME_LENGTH}
              onChange={(e) => {
                const value = e.target.value;
                updateField("name", value);
                setShowNameSuggestions(true);
              }}
              onFocus={() => setShowNameSuggestions(true)}
              onBlur={() => {
                // Delay hiding suggestions to allow onClick on suggestion buttons to fire first
                setTimeout(() => setShowNameSuggestions(false), 200);
              }}
              placeholder="e.g. Grilled Chicken Salad"
              required
              autoComplete="off"
              aria-required="true"
              aria-invalid={!!formError}
              aria-describedby={formError ? "meal-form-error" : undefined}
            />
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <div className="suggestions-panel" style={SUGGESTION_PANEL_STYLE}>
                {nameSuggestions.map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      applyFavoriteToForm(fav);
                      setShowNameSuggestions(false);
                    }}
                    className="suggestion-item"
                    style={SUGGESTION_ITEM_STYLE}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(139, 92, 246, 0.08)";
                      e.currentTarget.style.borderLeftColor = "rgba(139, 92, 246, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderLeftColor = "transparent";
                    }}
                  >
                    <div style={SUGGESTION_NAME_STYLE}>
                      <span style={SUGGESTION_MAIN_TEXT_STYLE}>{fav.name}</span>
                      <small style={SUGGESTION_SECONDARY_TEXT_STYLE}>
                        {(fav.mealData?.calories ?? fav.nutrition?.calories ?? "--") + " cal"}
                        {(fav.mealData?.servingSize ?? fav.servingSize) ? ` • ${fav.mealData?.servingSize ?? fav.servingSize}` : ""}
                        {fav.isFavorite ? " • in favorites" : " • from history"}
                      </small>
                    </div>
                    <div style={SUGGESTION_PLUS_BUTTON_STYLE}>+</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="form-field required">
            <label htmlFor="meal-calories">Calories</label>
            <input
              id="meal-calories"
              required
              type="number"
              min={0}
              max={MEAL_CONSTRAINTS.MAX_CALORIES}
              value={form.calories}
              onChange={(e) => updateField("calories", e.target.value)}
              placeholder="e.g. 450"
              autoComplete="off"
              aria-required="true"
              inputMode="decimal"
              aria-invalid={!!formError}
              aria-describedby={formError ? "meal-form-error" : undefined}
            />
          </div>
          <div className="form-field required">
            <label htmlFor="meal-serving-size">Serving Size</label>
            <input
              id="meal-serving-size"
              required
              value={form.servingSize}
              maxLength={MEAL_CONSTRAINTS.MAX_NAME_LENGTH}
              onChange={(e) => updateField("servingSize", e.target.value)}
              placeholder="e.g. 1 bowl"
              autoComplete="off"
              aria-required="true"
              aria-invalid={!!formError}
              aria-describedby={formError ? "meal-form-error" : undefined}
            />
          </div>
          <div className="form-field required">
            <label htmlFor="meal-servings">Servings Had</label>
            <input
              id="meal-servings"
              required
              type="number"
              min={0}
              step="0.1"
              value={form.servingsHad}
              onChange={(e) => updateField("servingsHad", e.target.value)}
              placeholder="e.g. 1.5"
              autoComplete="off"
              aria-required="true"
              inputMode="decimal"
              aria-invalid={!!formError}
              aria-describedby={formError ? "meal-form-error" : undefined}
            />
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
            <span className={`chev ${showOptional ? "open" : ""}`}></span>
            {showOptional ? "Hide optional nutrition" : "Show more nutrition values"}
          </button>
        </div>

        {/* Optional fields */}
        {showOptional && (
          <fieldset className="form-grid" id="optional-meal-fields" aria-labelledby="optional-nutrition-legend">
            <legend id="optional-nutrition-legend" style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 8 }}>Optional nutrition details</legend>
            <div className="form-field">
              <label htmlFor="meal-carbs">Total Carbs (g)</label>
              <input id="meal-carbs" type="number" min={0} max={MEAL_CONSTRAINTS.MAX_MACRO} step="0.01" value={form.totalCarbs} onChange={(e) => updateField("totalCarbs", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-fat">Total Fat (g)</label>
              <input id="meal-fat" type="number" min={0} max={MEAL_CONSTRAINTS.MAX_MACRO} step="0.01" value={form.totalFat} onChange={(e) => updateField("totalFat", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-protein">Protein (g)</label>
              <input id="meal-protein" type="number" min={0} max={MEAL_CONSTRAINTS.MAX_MACRO} step="0.01" value={form.protein} onChange={(e) => updateField("protein", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-fatcat">Fat Categories</label>
              <input id="meal-fatcat" value={form.fatCategories} maxLength={MEAL_CONSTRAINTS.MAX_NAME_LENGTH} onChange={(e) => updateField("fatCategories", e.target.value)} placeholder="e.g. Saturated, Unsaturated" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-sodium">Sodium (mg)</label>
              <input id="meal-sodium" type="number" min={0} step="0.01" value={form.sodium} onChange={(e) => updateField("sodium", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-sugars">Sugars (g)</label>
              <input id="meal-sugars" type="number" min={0} step="0.01" value={form.sugars} onChange={(e) => updateField("sugars", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-calcium">Calcium (mg)</label>
              <input id="meal-calcium" type="number" min={0} step="0.01" value={form.calcium} onChange={(e) => updateField("calcium", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-vitamins">Vitamins</label>
              <input id="meal-vitamins" value={form.vitamins} maxLength={MEAL_CONSTRAINTS.MAX_TEXT_LENGTH} onChange={(e) => updateField("vitamins", e.target.value)} placeholder="e.g. A, C, D" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-iron">Iron (mg)</label>
              <input id="meal-iron" type="number" min={0} step="0.01" value={form.iron} onChange={(e) => updateField("iron", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field span-2">
              <label htmlFor="meal-notes">Other Info / Notes</label>
              <textarea id="meal-notes" value={form.otherInfo} maxLength={MEAL_CONSTRAINTS.MAX_TEXT_LENGTH} onChange={(e) => updateField("otherInfo", e.target.value)} rows={3} placeholder="Any additional nutritional notes" />
            </div>
          </fieldset>
        )}

        <div className="form-actions" style={FORM_ACTIONS_STYLE}>
          <div style={BUTTON_GROUP_STYLE}>
            <button
              type="button"
              className="response-button favorites-modal-button"
              onClick={() => setShowFavoritesModal(true)}
            >
              Add From Your Favorites?
            </button>
          </div>
          <div style={BUTTON_GROUP_STYLE}>
            <button
              type="button"
              className="response-button"
              style={CLEAR_BUTTON_STYLE}
              onClick={resetForm}
            >
              Clear Fields
            </button>
            <button type="submit" className="response-button" disabled={submitting}>
              {submitting ? "Saving" : "Save Meal"}
            </button>
          </div>
        </div>

        {formError && (
          <div id="meal-form-error" role="alert" style={{ marginTop: 10, color: "#fca5a5", fontSize: "0.9rem" }}>
            {formError.message}
          </div>
        )}
        <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={closeToast} />
      </form>

      {showFavoritesModal &&
        createPortal(
          <div className="modal-overlay" style={{ zIndex: 100001 }}>
            <div className="modal-content meal-modal" style={{ zIndex: 100002, position: "relative" }}>
              <div className="modal-header-bar">
                <h2 className="modal-title">Select a Favorite Meal</h2>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowFavoritesModal(false)}
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18"/>
                    <path d="M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body-scroll" style={MODAL_BODY_STYLE}>
                <div style={{ marginBottom: 8 }}>
                  <input
                    type="text"
                    value={favoritesSearch}
                    onChange={(e) => setFavoritesSearch(e.target.value)}
                    placeholder="Search your favorites..."
                    style={SEARCH_INPUT_STYLE}
                  />
                </div>

                {filteredFavorites && filteredFavorites.length > 0 ? (
                  <ul className="favorites-list-ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {filteredFavorites.map((fav) => (
                      <li key={fav.id} className="favorites-list-item" style={{ marginBottom: 12 }}>
                        <button
                          type="button"
                          className="favorites-list-button"
                          style={FAVORITES_LIST_BUTTON_STYLE}
                          onClick={() => {
                            applyFavoriteToForm(fav);
                            setShowFavoritesModal(false);
                          }}
                        >
                          <div className="favorites-list-name" style={FAVORITES_LIST_NAME_STYLE}>
                            {fav.name}
                          </div>
                          <div className="favorites-list-meta" style={FAVORITES_LIST_META_STYLE}>
                            {fav.nutrition?.calories ?? "--"} cal • {fav.servingSize ?? "--"}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="favorites-list-empty" style={FAVORITES_LIST_EMPTY_STYLE}>
                    No favorites found.
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
};

export default MealForm;