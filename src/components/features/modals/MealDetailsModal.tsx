/**
 * MealDetailsModal Component
 * 
 * View/edit existing meal entries with authorization checks.
 * Implements:
 * - Authorization guards
 * - Focus trap & restoration
 * - Defensive data handling
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Lazy-load Firebase to reduce initial bundle size (Performance & Security)
const resolveFirebase = async () => {
  const mod: any = await import('../../../firebase');
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import('firebase/firestore');
  const firebaseAuth = await import('firebase/auth');
  return { db, firestore, firebaseAuth };
};
import type { Meal } from '../../../types/meal';
import Toast from '../../ui/Toast';
import { calculateActualCalories, calculateActualMacros } from '../../../utils/mealCalculations';
import { canAccess } from '../../../utils/authorization';
import { validateMeal, MEAL_CONSTRAINTS, parseNumber } from '../../../utils/mealValidation';

interface MealDetailsModalProps {
  isOpen: boolean;
  meal: Meal | null;
  onClose: () => void;
  /** Optional external save handler used when the modal is repurposed for favorites or other non-meal entities. 
   * If provided, it will be called instead of updating the `meals` collection. */
  onSaveExternal?: (mealId: string | undefined, updates: Record<string, any>) => Promise<void>;
}

const MealDetailsModal: React.FC<MealDetailsModalProps> = ({ isOpen, meal, onClose, onSaveExternal }) => {
  // UI state: Toggle between view and edit mode
  const [edit, setEdit] = useState(false);
  
  // Prevent double-submission during async save operation
  const [submitting, setSubmitting] = useState(false);
  
  // Form validation error display
  const [formError, setFormError] = useState<{ field?: string; message: string } | null>(null);
  
  // User feedback for success/error notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  
  // Form state: All fields as strings for easier input control 
  const [form, setForm] = useState({
    name: '',
    servingSize: '',
    servingsHad: '',
    calories: '',
    totalCarbs: '',
    totalFat: '',
    protein: '',
    fatCategories: '',
    sodium: '',
    sugars: '',
    calcium: '',
    vitamins: '',
    iron: '',
    otherInfo: '',
  });
  
  // Refs for focus trap implementation
  // Prevents keyboard users from accidentally focusing elements behind modal
  const modalRef = useRef<HTMLDivElement | null>(null);
  
  // Store last focused element before modal opens
  // Restore focus when modal closes (WCAG requirement for screen reader users)
  const lastFocusedRef = useRef<Element | null>(null);

  // Initialize modal with data and perform authorization check
  useEffect(() => {
    if (isOpen && meal) {
      // Clear any previous toast messages to avoid confusion
      setToast({ message: '', type: 'success', visible: false });
      
      (async () => {
        try {
          const { firebaseAuth } = await resolveFirebase();
          const user = firebaseAuth.getAuth ? firebaseAuth.getAuth().currentUser : null;
          
          // Authorization check - verify user can access this meal
          // Prevents users from viewing/editing meals they don't own
          // Exception: External handlers (favorites) have their own authorization
          if (!onSaveExternal && (!user || !canAccess(user.uid, meal.userId))) {
            showToast('Unauthorized: Cannot access this meal', 'error');
            onClose();
            return;
          }
          
          // Start in view mode (not edit) for safety
          setEdit(false);
          
          // Populate form with defensive null checks
          setForm({
            name: meal.name || '',
            servingSize: meal.servingSize || '',
            servingsHad: meal.servingsHad != null ? String(meal.servingsHad) : '',
            calories: meal.calories != null ? String(meal.calories) : '',
            totalCarbs: meal.totalCarbs != null ? String(meal.totalCarbs) : '',
            totalFat: meal.totalFat != null ? String(meal.totalFat) : '',
            protein: meal.protein != null ? String(meal.protein) : '',
            fatCategories: meal.fatCategories || '',
            sodium: meal.sodium != null ? String(meal.sodium) : '',
            sugars: meal.sugars != null ? String(meal.sugars) : '',
            calcium: meal.calcium != null ? String(meal.calcium) : '',
            vitamins: meal.vitamins || '',
            iron: meal.iron != null ? String(meal.iron) : '',
            otherInfo: meal.otherInfo || '',
          });
        } catch (err) {
          console.error('Error initializing meal modal auth', err);
          onClose();
        }
      })();
    } else if (!isOpen) {
      // Reset toast when closing modal
      setToast({ message: '', type: 'success', visible: false });
    }
  }, [isOpen, meal, onSaveExternal]);

  // Implement focus trap and keyboard navigation (WCAG 2.1 requirement)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus trap: Keep Tab navigation within modal boundaries
      // Prevents keyboard users from accidentally focusing background content
      if (event.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        
        // Shift+Tab on first element wraps to last element
        if (event.shiftKey) {
          if (active === first || !modalRef.current.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else {
          // Tab on last element wraps to first element
          if (active === last || !modalRef.current.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      
      // ESC key closes modal (expected keyboard behavior)
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      // Store element that had focus before modal opened
      lastFocusedRef.current = document.activeElement;
      
      document.addEventListener('keydown', handleKeyDown);
      
      // Prevent body scrolling while modal is open (UX best practice)
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      // Auto-focus first focusable element when modal opens
      // Screen reader users immediately know modal is active
      setTimeout(() => {
        const first = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }, 0);
      
      // Cleanup: Restore focus and body scroll on unmount
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
        
        // Restore focus to element that opened modal
        // Maintains user's place in document (WCAG requirement)
        if (lastFocusedRef.current instanceof HTMLElement) {
          lastFocusedRef.current.focus();
        }
      };
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type, visible: true });
  const closeToast = () => setToast((t) => ({ ...t, visible: false }));

  const updateField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const formattedDate = useMemo(() => {
    if (!meal) return '';
    const v: any = meal.createdAt as any;
    const ms = typeof v === 'number'
      ? v
      : v && typeof v.seconds === 'number'
        ? v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6)
        : v instanceof Date
          ? v.getTime()
          : 0;
    return ms ? new Date(ms).toLocaleString() : '';
  }, [meal]);

  // Save handler with validation and authorization checks
  const handleSave = async () => {
    const { firebaseAuth } = await resolveFirebase();
    const user = firebaseAuth.getAuth ? firebaseAuth.getAuth().currentUser : null;
    
    // Guard against missing meal data
    if (!meal) return;

    // Validate using centralized validation utility (DRY principle)
    // Ensures consistent validation rules across all components
    const validationError = validateMeal(form);
    if (validationError) {
      setFormError({ message: validationError.message });
      showToast(validationError.message, 'error');
      return;
    }

    // Authorization check - verify user can modify this meal
    // Prevents unauthorized edits even if UI improperly allows edit mode
    // Exception: External handlers (favorites) have their own authorization
    if (!onSaveExternal && !canAccess(user?.uid || '', meal.userId)) {
      showToast('Unauthorized: Cannot modify this meal', 'error');
      setEdit(false);
      return;
    }

    // Prevent double-submission
    setSubmitting(true);
    try {
      const updates: any = {
        name: form.name.trim(),
        servingSize: form.servingSize.trim(),
        calories: Number(form.calories),
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
        if (typeof parsed === 'number') updates[key] = parsed;
        // Don't set null - Firestore rejects it, just omit the field
      });

      const stringOptional: Record<string, string> = {
        fatCategories: form.fatCategories,
        vitamins: form.vitamins,
        otherInfo: form.otherInfo,
      };
      Object.entries(stringOptional).forEach(([key, raw]) => {
        const trimmed = raw.trim();
        if (trimmed) updates[key] = trimmed;
        // Don't set null - Firestore rejects it, just omit the field
      });

      // If an external save handler is provided (e.g., for favorites), call it instead
      if (typeof onSaveExternal === 'function') {
        await onSaveExternal(meal.id, updates);
        showToast('Saved successfully', 'success');
        setEdit(false);
      } else {
        const { db, firestore } = await resolveFirebase();
        const ref = firestore.doc(db, 'meals', meal.id!);
        await firestore.updateDoc(ref, updates);
        
        // Also update the meal name in user's favorites if it exists
        try {
          const userDocRef = firestore.doc(db, 'users', user?.uid || '');
          const userSnap = await firestore.getDoc(userDocRef);
          if (userSnap.exists()) {
            const favorites = userSnap.data().favorites_v2 || [];
            const mealNameChanged = meal.name && updates.name && meal.name.toLowerCase() !== updates.name.toLowerCase();
            
            // Check if any favorite matches this meal's name
            const favToUpdate = favorites.filter((fav: any) => 
              fav.name && fav.name.toLowerCase() === meal.name.toLowerCase()
            );
            
            if (favToUpdate.length > 0) {
              // Update all matching favorites with new meal data
              const updatedFavorites = favorites.map((fav: any) => {
                if (fav.name && fav.name.toLowerCase() === meal.name.toLowerCase()) {
                  return {
                    ...fav,
                    name: updates.name || fav.name,
                    servingSize: updates.servingSize || fav.servingSize,
                    nutrition: {
                      ...fav.nutrition,
                      calories: updates.calories ?? fav.nutrition?.calories,
                      carbs: updates.totalCarbs ?? fav.nutrition?.carbs,
                      fat: updates.totalFat ?? fav.nutrition?.fat,
                      protein: updates.protein ?? fav.nutrition?.protein,
                      sodium: updates.sodium ?? fav.nutrition?.sodium,
                      sugars: updates.sugars ?? fav.nutrition?.sugars,
                      calcium: updates.calcium ?? fav.nutrition?.calcium,
                      iron: updates.iron ?? fav.nutrition?.iron,
                      fatCategories: updates.fatCategories ?? fav.nutrition?.fatCategories,
                      vitamins: updates.vitamins ?? fav.nutrition?.vitamins,
                      otherInfo: updates.otherInfo ?? fav.nutrition?.otherInfo,
                    }
                  };
                }
                return fav;
              });
              
              // Update favorites in user document
              await firestore.updateDoc(userDocRef, { favorites_v2: updatedFavorites });
            }
          }
        } catch (favErr) {
          // Log but don't fail the save if favorites update fails
          console.warn('Could not update favorites when meal changed:', favErr);
        }
        
        showToast('Meal updated', 'success');
        setEdit(false);
      }
    } catch (e: any) {
      console.error('Save error:', e);
      showToast(e.message || 'Failed to update meal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Guard edit mode with authentication and authorization checks
  // Prevents unauthorized users from even entering edit mode
  const handleEditClick = async () => {
    const { firebaseAuth } = await resolveFirebase();
    const user = firebaseAuth.getAuth ? firebaseAuth.getAuth().currentUser : null;
    
    // Require authentication before allowing edits
    if (!user || !meal) {
      showToast('You must be signed in to edit meals', 'error');
      return;
    }
    
    // Verify user owns or has permission to edit this meal
    // Defense-in-depth - check authorization at every action point
    if (!canAccess(user.uid, meal.userId)) {
      showToast('Unauthorized: Cannot edit this meal', 'error');
      return;
    }
    
    setEdit(true);
  };

  if (!isOpen || !meal) return null;

  return createPortal(
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content meal-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-bar">
          <div>
            <h2>Meal Details</h2>
            <div className="modal-subdued-meta">{formattedDate}</div>
          </div>
          <div className="modal-actions">
            <button type="button" className="close-button" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              Close
            </button>
          </div>
        </div>
        <div className="modal-body-scroll">
          {!edit ? (
            <>
              <div className="meal-fields-grid">
                <div className="field-block"><label>Name</label><div className="field-value-display">{meal.name}</div></div>
                <div className="field-block"><label>Serving Size</label><div className="field-value-display">{meal.servingSize}</div></div>
                <div className="field-block"><label>Servings Had</label><div className="field-value-display">{meal.servingsHad ?? 1}</div></div>
                <div className="field-block"><label>Calories (per serving)</label><div className="field-value-display">{meal.calories}</div></div>
                <div className="field-block"><label>Protein (g per serving)</label><div className="field-value-display">{meal.protein ?? '-'}</div></div>
                <div className="field-block"><label>Total Carbs (g per serving)</label><div className="field-value-display">{meal.totalCarbs ?? '-'}</div></div>
                <div className="field-block"><label>Total Fat (g per serving)</label><div className="field-value-display">{meal.totalFat ?? '-'}</div></div>
                <div className="field-block"><label>Sodium (mg)</label><div className="field-value-display">{meal.sodium ?? '-'}</div></div>
                <div className="field-block"><label>Sugars (g)</label><div className="field-value-display">{meal.sugars ?? '-'}</div></div>
                <div className="field-block"><label>Calcium (mg)</label><div className="field-value-display">{meal.calcium ?? '-'}</div></div>
                <div className="field-block"><label>Iron (mg)</label><div className="field-value-display">{meal.iron ?? '-'}</div></div>
                <div className="field-block"><label>Vitamins</label><div className="field-value-display">{meal.vitamins ?? '-'}</div></div>
                <div className="field-block span-2"><label>Other Info</label><div className="field-value-display">{meal.otherInfo ?? '-'}</div></div>
              </div>
              {meal.servingsHad && meal.servingsHad !== 1 && (
                <div style={{ 
                  marginTop: '1.5rem', 
                  padding: '1rem', 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa', fontSize: '0.875rem', fontWeight: 600 }}>
                    Actual Consumed ({meal.servingsHad} servings)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <div><strong>Calories:</strong> {calculateActualCalories(meal)}</div>
                    <div><strong>Protein:</strong> {calculateActualMacros(meal).protein ?? '-'}g</div>
                    <div><strong>Carbs:</strong> {calculateActualMacros(meal).carbs ?? '-'}g</div>
                    <div><strong>Fat:</strong> {calculateActualMacros(meal).fat ?? '-'}g</div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="meal-fields-grid">
              <div className="field-block required"><label>Name *</label><input value={form.name} onChange={(e) => { updateField('name', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block required"><label>Serving Size *</label><input value={form.servingSize} onChange={(e) => { updateField('servingSize', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Servings Had</label><input type="number" min={0} step="0.1" value={form.servingsHad} onChange={(e) => { updateField('servingsHad', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block required"><label>Calories *</label><input type="number" min={0} value={form.calories} onChange={(e) => { updateField('calories', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Protein (g)</label><input type="number" min={0} value={form.protein} onChange={(e) => { updateField('protein', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Total Carbs (g)</label><input type="number" min={0} value={form.totalCarbs} onChange={(e) => { updateField('totalCarbs', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Total Fat (g)</label><input type="number" min={0} value={form.totalFat} onChange={(e) => { updateField('totalFat', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Sodium (mg)</label><input type="number" min={0} value={form.sodium} onChange={(e) => { updateField('sodium', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Sugars (g)</label><input type="number" min={0} value={form.sugars} onChange={(e) => { updateField('sugars', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Calcium (mg)</label><input type="number" min={0} value={form.calcium} onChange={(e) => { updateField('calcium', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Iron (mg)</label><input type="number" min={0} value={form.iron} onChange={(e) => { updateField('iron', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block"><label>Vitamins</label><input value={form.vitamins} onChange={(e) => { updateField('vitamins', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              <div className="field-block span-2"><label>Other Info</label><textarea rows={3} value={form.otherInfo} onChange={(e) => { updateField('otherInfo', e.target.value); setFormError(null); }} aria-invalid={!!formError} aria-describedby={formError ? "meal-modal-error" : undefined} /></div>
              {formError && (
                <div id="meal-modal-error" role="alert" style={{ gridColumn: 'span 2', marginTop: 10, color: "#fca5a5", fontSize: "0.9rem" }}>
                  {formError.message}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer-bar">
          {edit ? (
            <>
              <button type="button" className="cancel-button" onClick={() => setEdit(false)} disabled={submitting}>Cancel</button>
              <button type="button" className="response-button" onClick={handleSave} disabled={submitting}>{submitting ? 'Saving…' : 'Save Changes'}</button>
            </>
          ) : (
            <button type="button" className="response-button" onClick={handleEditClick}>Edit</button>
          )}
        </div>
        <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={closeToast} />
      </div>
    </div>,
    document.body
  );
};

export default MealDetailsModal;
