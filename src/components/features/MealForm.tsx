import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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

interface MealFormProps {
  onMealAdded: (meal: Meal) => void;
  initialMeal?: Meal | null;
  onInitialMealSet?: () => void;
  planningMode?: boolean; // If true, don't save to meals collection, only call onMealAdded
}

const MealForm: React.FC<MealFormProps> = ({ onMealAdded, initialMeal, onInitialMealSet, planningMode = false }) => {
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
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({
    message: "",
    type: "success",
    visible: false,
  });
  const [showOptional, setShowOptional] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteItem[] | null>(null);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string>("");
  const [favoritesSearch, setFavoritesSearch] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Fill form when initialMeal is provided
  useEffect(() => {
    if (initialMeal) {
      setForm({
        name: initialMeal.name || "",
        calories: String(initialMeal.calories ?? ""),
        servingSize: initialMeal.servingSize || "",
        servingsHad: initialMeal.servingsHad != null ? String(initialMeal.servingsHad) : "",
        totalCarbs: initialMeal.totalCarbs != null ? String(initialMeal.totalCarbs) : "",
        totalFat: initialMeal.totalFat != null ? String(initialMeal.totalFat) : "",
        protein: initialMeal.protein != null ? String(initialMeal.protein) : "",
        fatCategories: initialMeal.fatCategories || "",
        sodium: initialMeal.sodium != null ? String(initialMeal.sodium) : "",
        sugars: initialMeal.sugars != null ? String(initialMeal.sugars) : "",
        calcium: initialMeal.calcium != null ? String(initialMeal.calcium) : "",
        vitamins: initialMeal.vitamins || "",
        iron: initialMeal.iron != null ? String(initialMeal.iron) : "",
        otherInfo: initialMeal.otherInfo || "",
      });
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

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type, visible: true });
  };

  const closeToast = () => setToast((t) => ({ ...t, visible: false }));

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  const requiredMissing = () => {
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("Meal name");
    if (!form.calories.trim()) missing.push("Calories");
    if (!form.servingSize.trim()) missing.push("Serving size");
    if (!form.servingsHad.trim()) missing.push("Servings Had");
    return missing;
  };

  const parseNumber = (val: string): number | undefined => {
    if (!val.trim()) return undefined;
    const n = Number(val);
    return isFinite(n) ? n : undefined;
  };

  // Load user's favorites for quick-add
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
        const sorted = (favs || []).slice().sort((a: FavoriteItem, b: FavoriteItem) => (a.name || "").localeCompare(b.name || ""));
        if (mounted) setFavorites(sorted);
      } catch (e) {
        console.error("Failed to load favorites", e);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await getCurrentUser();
    if (!user) {
      showToast("You must be signed in to save meals", "error");
      return;
    }
    const missing = requiredMissing();
    if (missing.length) {
      showToast(`Missing required: ${missing.join(", ")}`, "error");
      return;
    }
    setSubmitting(true);
    try {
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
        const trimmed = raw.trim();
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
            <label>Meal Name</label>
            <input
              value={form.name}
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
            <label>Calories</label>
            <input required type="number" min={0} value={form.calories} onChange={(e) => updateField("calories", e.target.value)} placeholder="e.g. 450" aria-required="true" />
          </div>
          <div className="form-field required">
            <label>Serving Size</label>
            <input required value={form.servingSize} onChange={(e) => updateField("servingSize", e.target.value)} placeholder="e.g. 1 bowl" aria-required="true" />
          </div>
          <div className="form-field required">
            <label>Servings Had</label>
            <input required type="number" min={0} step="0.1" value={form.servingsHad} onChange={(e) => updateField("servingsHad", e.target.value)} placeholder="e.g. 1.5" aria-required="true" />
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
          <div className="form-grid" id="optional-meal-fields">
            <div className="form-field">
              <label>Total Carbs (g)</label>
              <input type="number" min={0} value={form.totalCarbs} onChange={(e) => updateField("totalCarbs", e.target.value)} />
            </div>
            <div className="form-field">
              <label>Total Fat (g)</label>
              <input type="number" min={0} value={form.totalFat} onChange={(e) => updateField("totalFat", e.target.value)} />
            </div>
            <div className="form-field">
              <label>Protein (g)</label>
              <input type="number" min={0} value={form.protein} onChange={(e) => updateField("protein", e.target.value)} />
            </div>
            <div className="form-field">
              <label>Fat Categories</label>
              <input value={form.fatCategories} onChange={(e) => updateField("fatCategories", e.target.value)} placeholder="e.g. Saturated, Unsaturated" />
            </div>
            <div className="form-field">
              <label>Sodium (mg)</label>
              <input type="number" min={0} value={form.sodium} onChange={(e) => updateField("sodium", e.target.value)} />
            </div>
            <div className="form-field">
              <label>Sugars (g)</label>
              <input type="number" min={0} value={form.sugars} onChange={(e) => updateField("sugars", e.target.value)} />
            </div>
            <div className="form-field">
              <label>Calcium (mg)</label>
              <input type="number" min={0} value={form.calcium} onChange={(e) => updateField("calcium", e.target.value)} />
            </div>
            <div className="form-field">
              <label>Vitamins</label>
              <input value={form.vitamins} onChange={(e) => updateField("vitamins", e.target.value)} placeholder="e.g. A, C, D" />
            </div>
            <div className="form-field">
              <label>Iron (mg)</label>
              <input type="number" min={0} value={form.iron} onChange={(e) => updateField("iron", e.target.value)} />
            </div>
            <div className="form-field span-2">
              <label>Other Info / Notes</label>
              <textarea value={form.otherInfo} onChange={(e) => updateField("otherInfo", e.target.value)} rows={3} placeholder="Any additional nutritional notes" />
            </div>
          </div>
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
