/**
 * MealForm Component
 * 
 * Main form for adding/editing meal entries with nutrition tracking.
 * Implements security, accessibility, and reliability best practices:
 * - Input validation & sanitization
 * - ARIA attributes & keyboard navigation
 * - Defensive parsing & error handling
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

interface MealFormProps {
  onMealAdded: (meal: Meal) => void;
  initialMeal?: Meal | null;
  onInitialMealSet?: () => void;
  planningMode?: boolean; // If true, don't save to meals collection, only call onMealAdded
}

const MealForm: React.FC<MealFormProps> = ({ onMealAdded, initialMeal, onInitialMealSet, planningMode = false }) => {
  // Form state: All fields stored as strings for easier input controls
  // Numbers are parsed/validated only on submit to avoid blocking user typing
  const [form, setForm] = useState({
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
  });

  // Prevent double-submission during async operations
  const [submitting, setSubmitting] = useState(false);

  // User-facing notifications for success/error feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({
    message: "",
    type: "success",
    visible: false,
  });

  // Structured error state tied to ARIA attributes for screen reader announcements
  const [formError, setFormError] = useState<{ field?: string; message: string } | null>(null);

  // UI state for collapsible sections and modals
  const [showOptional, setShowOptional] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteItem[] | null>(null);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string>("");
  const [favoritesSearch, setFavoritesSearch] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Defensively populate form from initialMeal with optional chaining and fallbacks
  // Prevents crashes if database schema changes or data is incomplete
  // Optional chaining (?.) returns undefined for missing properties instead of throwing
  useEffect(() => {
    if (initialMeal) {
      setForm({
        name: initialMeal?.name ?? "",
        calories: initialMeal?.calories != null ? String(initialMeal?.calories) : "",
        servingSize: initialMeal?.servingSize ?? "",
        servingsHad: initialMeal?.servingsHad != null ? String(initialMeal?.servingsHad) : "",
        totalCarbs: initialMeal?.totalCarbs != null ? String(initialMeal?.totalCarbs) : "",
        totalFat: initialMeal?.totalFat != null ? String(initialMeal?.totalFat) : "",
        protein: initialMeal?.protein != null ? String(initialMeal?.protein) : "",
        fatCategories: initialMeal?.fatCategories ?? "",
        sodium: initialMeal?.sodium != null ? String(initialMeal?.sodium) : "",
        sugars: initialMeal?.sugars != null ? String(initialMeal?.sugars) : "",
        calcium: initialMeal?.calcium != null ? String(initialMeal?.calcium) : "",
        vitamins: initialMeal?.vitamins ?? "",
        iron: initialMeal?.iron != null ? String(initialMeal?.iron) : "",
        otherInfo: initialMeal?.otherInfo ?? "",
      });
      if (onInitialMealSet) {
        onInitialMealSet();
      }
    }
  }, [initialMeal, onInitialMealSet]);

  // Lazy auth fetch avoids bundling Firebase in initial chunk
  // Reduces initial bundle size and only loads auth when actually needed
  const getCurrentUser = async () => {
    const { firebaseAuth } = await resolveFirebase();
    return firebaseAuth.getAuth ? firebaseAuth.getAuth().currentUser : null;
  };

  // User feedback helpers for success/error messaging
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
  };

  const closeToast = () => setToast((t) => ({ ...t, visible: false }));

  // Clear field-level error when user starts correcting input
  // Prevents stale error messages and provides immediate feedback
  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formError && formError.field === field) {
      setFormError(null);
    }
  };

  const resetForm = () => {
    setForm({
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
    });
    setShowOptional(false);
  };

  // Check for missing required fields before submission
  // Provides clear feedback about what's missing instead of silent failure
  const requiredMissing = () => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Meal name");
    if (!form.calories.trim()) missing.push("Calories");
    if (!form.servingSize.trim()) missing.push("Serving size");
    if (!form.servingsHad.trim()) missing.push("Servings Had");
    return missing;
  };

  // Load favorites with graceful failure handling
  // Form remains usable even if favorites fail to load (network issue, etc.)
  // Mounted flag prevents state updates after component unmounts (memory leak prevention)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          if (mounted) setFavorites([]);
          return;
        }
        const favs = await getFavoritesForUser(user.uid);
        // Sort alphabetically for easier scanning and user experience
        const sorted = (favs || []).slice().sort((a: FavoriteItem, b: FavoriteItem) => (a.name || "").localeCompare(b.name || ""));
        if (mounted) setFavorites(sorted);
      } catch (e) {
        console.error("Failed to load favorites", e);
        // Fail silently with empty array - form is still usable
        if (mounted) setFavorites([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredFavorites = useMemo(() => {
    const term = favoritesSearch.trim().toLowerCase();
    if (!favorites) return [] as FavoriteItem[];
    const base = favorites;
    const filtered = term ? base.filter((f) => (f.name || "").toLowerCase().includes(term)) : base;
    return filtered.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [favorites, favoritesSearch]);

  const nameSuggestions = useMemo(() => {
    const term = form.name.trim().toLowerCase();
    if (!favorites || !term) return [] as FavoriteItem[];
    const matches = favorites.filter((f) => (f.name || "").toLowerCase().includes(term));
    return matches.slice(0, 6).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [favorites, form.name]);

  // Main submission handler with multi-layered validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Require authentication before any write operation
    const user = await getCurrentUser();
    if (!user) {
      showToast("You must be signed in to save meals", "error");
      return;
    }

    // Check required fields first (fast validation)
    const missing = requiredMissing();
    if (missing.length) {
      showToast(`Missing required: ${missing.join(", ")}`, "error");
      return;
    }

    // Validate using centralized validation utility (DRY principle)
    // Ensures consistent validation rules across all components
    const validationError = validateMeal(form);
    if (validationError) {
      setFormError({ message: validationError.message });
      showToast(validationError.message, "error");
      return;
    }

    // Strip angle brackets to reduce XSS risk if data is ever exported or rendered unsafely
    // React escapes by default, but downstream uses (CSV export, etc.) might not
    const sanitize = (val: string) => val.replace(/[<>]/g, "").trim();

    // Prevent double-submission during async save
    setSubmitting(true);
    try {
      const mealBase: Meal = {
        userId: user.uid,
        name: sanitize(form.name),
        calories: Number(form.calories),
        servingSize: sanitize(form.servingSize),
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
        if (typeof parsed === "number") {
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
        const trimmed = sanitize(raw);
        if (trimmed) {
          // @ts-expect-error dynamic assignment of optional field
          mealBase[key] = trimmed;
        }
      });

      const meal: Meal = mealBase;
      const { db, firestore } = await resolveFirebase();

      if (planningMode) {
        showToast("Meal prepared for planning!", "success");
        onMealAdded(meal);
      } else {
        const ref = await firestore.addDoc(firestore.collection(db, "meals"), meal);
        console.debug("[MealForm] Added meal", { id: ref.id, meal });
        const added: Meal = { ...meal, id: ref.id };
        onMealAdded(added);
        showToast("Meal saved", "success");
      }
      setForm({
        name: "", calories: "", servingSize: "", servingsHad: "", totalCarbs: "", totalFat: "", protein: "", fatCategories: "", sodium: "", sugars: "", calcium: "", vitamins: "", iron: "", otherInfo: "",
      });
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to save meal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form className="meal-form" onSubmit={handleSubmit}>
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
              onBlur={() => setTimeout(() => setShowNameSuggestions(false), 120)}
              placeholder="e.g. Grilled Chicken Salad"
              required
              aria-required="true"
              aria-invalid={!!formError}
              aria-describedby={formError ? "meal-form-error" : undefined}
            />
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <div
                className="suggestions-panel"
                style={{
                  position: "absolute",
                  zIndex: 20,
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "rgba(26, 26, 46, 0.98)",
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  borderRadius: 12,
                  marginTop: 6,
                  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(139, 92, 246, 0.1)",
                  maxHeight: 140,
                  overflowY: "auto",
                  backdropFilter: "blur(10px)",
                }}
              >
                {nameSuggestions.map((fav) => (
                  <button
                    key={fav.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        name: fav.name || prev.name,
                        calories: fav.nutrition?.calories != null ? String(fav.nutrition.calories) : prev.calories,
                        servingSize: fav.servingSize != null ? fav.servingSize : prev.servingSize,
                        totalCarbs: fav.nutrition?.carbs != null ? String(fav.nutrition.carbs) : prev.totalCarbs,
                        totalFat: fav.nutrition?.fat != null ? String(fav.nutrition.fat) : prev.totalFat,
                        protein: fav.nutrition?.protein != null ? String(fav.nutrition.protein) : prev.protein,
                        sodium: fav.nutrition?.sodium != null ? String(fav.nutrition.sodium) : prev.sodium,
                        sugars: fav.nutrition?.sugars != null ? String(fav.nutrition.sugars) : prev.sugars,
                        calcium: fav.nutrition?.calcium != null ? String(fav.nutrition.calcium) : prev.calcium,
                        iron: fav.nutrition?.iron != null ? String(fav.nutrition.iron) : prev.iron,
                        fatCategories: fav.nutrition?.fatCategories != null ? String(fav.nutrition.fatCategories) : prev.fatCategories,
                        vitamins: fav.nutrition?.vitamins != null ? String(fav.nutrition.vitamins) : prev.vitamins,
                        otherInfo: fav.nutrition?.otherInfo != null ? String(fav.nutrition.otherInfo) : prev.otherInfo,
                      }));
                      setShowNameSuggestions(false);
                    }}
                    className="suggestion-item"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      padding: "10px 14px",
                      background: "transparent",
                      color: "#e2e8f0",
                      border: "none",
                      borderBottom: "1px solid rgba(139, 92, 246, 0.1)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(139, 92, 246, 0.08)";
                      e.currentTarget.style.borderLeftColor = "rgba(139, 92, 246, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderLeftColor = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                      <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{fav.name}</span>
                      <small style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        {(fav.nutrition?.calories ?? "--") + " cal"}
                        {fav.servingSize ? ` • ${fav.servingSize}` : ""}
                      </small>
                    </div>
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "rgba(139, 92, 246, 0.15)",
                      border: "1.5px solid rgba(139, 92, 246, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      color: "#8b5cf6",
                      flexShrink: 0
                    }}>
                      +
                    </div>
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
              <input id="meal-carbs" type="number" min={0} max={MEAL_CONSTRAINTS.MAX_MACRO} value={form.totalCarbs} onChange={(e) => updateField("totalCarbs", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-fat">Total Fat (g)</label>
              <input id="meal-fat" type="number" min={0} max={MEAL_CONSTRAINTS.MAX_MACRO} value={form.totalFat} onChange={(e) => updateField("totalFat", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-protein">Protein (g)</label>
              <input id="meal-protein" type="number" min={0} max={MEAL_CONSTRAINTS.MAX_MACRO} value={form.protein} onChange={(e) => updateField("protein", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-fatcat">Fat Categories</label>
              <input id="meal-fatcat" value={form.fatCategories} maxLength={MEAL_CONSTRAINTS.MAX_NAME_LENGTH} onChange={(e) => updateField("fatCategories", e.target.value)} placeholder="e.g. Saturated, Unsaturated" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-sodium">Sodium (mg)</label>
              <input id="meal-sodium" type="number" min={0} value={form.sodium} onChange={(e) => updateField("sodium", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-sugars">Sugars (g)</label>
              <input id="meal-sugars" type="number" min={0} value={form.sugars} onChange={(e) => updateField("sugars", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-calcium">Calcium (mg)</label>
              <input id="meal-calcium" type="number" min={0} value={form.calcium} onChange={(e) => updateField("calcium", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-vitamins">Vitamins</label>
              <input id="meal-vitamins" value={form.vitamins} maxLength={MEAL_CONSTRAINTS.MAX_TEXT_LENGTH} onChange={(e) => updateField("vitamins", e.target.value)} placeholder="e.g. A, C, D" />
            </div>
            <div className="form-field">
              <label htmlFor="meal-iron">Iron (mg)</label>
              <input id="meal-iron" type="number" min={0} value={form.iron} onChange={(e) => updateField("iron", e.target.value)} inputMode="decimal" />
            </div>
            <div className="form-field span-2">
              <label htmlFor="meal-notes">Other Info / Notes</label>
              <textarea id="meal-notes" value={form.otherInfo} maxLength={MEAL_CONSTRAINTS.MAX_TEXT_LENGTH} onChange={(e) => updateField("otherInfo", e.target.value)} rows={3} placeholder="Any additional nutritional notes" />
            </div>
            </fieldset>
        )}

        <div className="form-actions" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="response-button favorites-modal-button"
              onClick={() => setShowFavoritesModal(true)}
            >
              Add From Your Favorites?
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="response-button"
              style={{ background: "#334155" }}
              onClick={resetForm}
            >
              Clear Fields
            </button>
            <button type="submit" className="response-button" disabled={submitting}>{submitting ? "Saving" : "Save Meal"}</button>
          </div>
        </div>
        {formError && (
          <div id="meal-form-error" role="alert" style={{ marginTop: 10, color: "#fca5a5", fontSize: "0.9rem" }}>
            {formError.message}
          </div>
        )}
        <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={closeToast} />
      </form>

      {showFavoritesModal && createPortal(
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
            <div className="modal-body-scroll" style={{ height: "70vh", maxHeight: "70vh", overflowY: "auto", padding: "1.25rem 1.75rem", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  value={favoritesSearch}
                  onChange={(e) => setFavoritesSearch(e.target.value)}
                  placeholder="Search your favorites..."
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #2b2b45", background: "#11172b", color: "#e2e8f0" }}
                />
              </div>
              {(filteredFavorites && filteredFavorites.length > 0) ? (
                <ul className="favorites-list-ul" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {filteredFavorites.map((fav) => (
                    <li key={fav.id} className="favorites-list-item" style={{ marginBottom: 12 }}>
                      <button
                        type="button"
                        className="favorites-list-button"
                        style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 6, border: "1px solid #eee", background: "#232347", color: "#e2e8f0", cursor: "pointer", fontWeight: 500 }}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            name: fav.name || prev.name,
                            calories: fav.nutrition?.calories != null ? String(fav.nutrition.calories) : prev.calories,
                            servingSize: fav.servingSize != null ? fav.servingSize : prev.servingSize,
                            totalCarbs: fav.nutrition?.carbs != null ? String(fav.nutrition.carbs) : prev.totalCarbs,
                            totalFat: fav.nutrition?.fat != null ? String(fav.nutrition.fat) : prev.totalFat,
                            protein: fav.nutrition?.protein != null ? String(fav.nutrition.protein) : prev.protein,
                            sodium: fav.nutrition?.sodium != null ? String(fav.nutrition.sodium) : prev.sodium,
                            sugars: fav.nutrition?.sugars != null ? String(fav.nutrition.sugars) : prev.sugars,
                            calcium: fav.nutrition?.calcium != null ? String(fav.nutrition.calcium) : prev.calcium,
                            iron: fav.nutrition?.iron != null ? String(fav.nutrition.iron) : prev.iron,
                            fatCategories: fav.nutrition?.fatCategories != null ? String(fav.nutrition.fatCategories) : prev.fatCategories,
                            vitamins: fav.nutrition?.vitamins != null ? String(fav.nutrition.vitamins) : prev.vitamins,
                            otherInfo: fav.nutrition?.otherInfo != null ? String(fav.nutrition.otherInfo) : prev.otherInfo,
                          }));
                          setShowFavoritesModal(false);
                        }}
                      >
                        <div className="favorites-list-name" style={{ fontSize: 16 }}>{fav.name}</div>
                        <div className="favorites-list-meta" style={{ fontSize: 13, color: "#94a3b8" }}>{fav.nutrition?.calories ?? "--"} cal  {fav.servingSize ?? "--"}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="favorites-list-empty" style={{ color: "#888", textAlign: "center", marginTop: 24 }}>No favorites found.</div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default MealForm;
