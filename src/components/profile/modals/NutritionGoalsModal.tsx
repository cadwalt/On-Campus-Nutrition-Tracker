import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { resolveFirebase } from '../../../lib/resolveFirebase';
import Toast from '../../ui/Toast';
import type { 
  NutritionGoals, 
  PrimaryGoal, 
  ActivityLevel
} from '../../../types/nutrition';
import { 
  GOAL_OPTIONS, 
  ACTIVITY_LEVELS
} from '../../../constants/nutrition';
import { Tooltip } from '../../ui';

interface NutritionGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  validationErrors: string[];
  nutritionGoals: NutritionGoals | null;
  currentWeight: number | '';
  targetWeight: number | '';
  height: number | '';
  proteinPercentage: number;
  carbsPercentage: number;
  fatPercentage: number;
  totalPercentage: number;
  onGoalSelection: (goalId: PrimaryGoal) => void;
  onActivityLevelChange: (activityLevel: ActivityLevel) => void;
  onCurrentWeightChange: (weight: number | '') => void;
  onTargetWeightChange: (weight: number | '') => void;
  onHeightChange: (height: number | '') => void;
  onProteinChange: (value: number) => void;
  onCarbsChange: (value: number) => void;
  onFatChange: (value: number) => void;
  onResetToRecommended: () => void;
  // Optional initial values passed when opening the modal. Can be `null`.
  // Note: modal reads from `nutritionGoals` prop; `initialValues` removed
  // from usage to avoid unused-parameter errors during build.
  // Optional callback invoked by the modal after a verified save so the
  // parent can refresh derived state without navigating.
  onPersisted?: (savedGoals: NutritionGoals) => void;
  // Current signed-in user (needed to write the user's document).
  user: User;
}

const NutritionGoalsModal: React.FC<NutritionGoalsModalProps> = ({
  isOpen,
  onClose,
  loading,
  validationErrors,
  nutritionGoals,
  currentWeight,
  targetWeight,
  height,
  proteinPercentage,
  carbsPercentage,
  fatPercentage,
  totalPercentage,
  onGoalSelection,
  onActivityLevelChange,
  onCurrentWeightChange,
  onTargetWeightChange,
  onHeightChange,
  onProteinChange,
  onCarbsChange,
  onFatChange,
  onResetToRecommended,
  onPersisted,
  user
}) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);

  const showLocalToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };
  // Handle ESC key to close modal and body scroll management
  // Important: when the modal is open we prevent body scroll by setting
  // `document.body.style.overflow = 'hidden'`. We store and restore the
  // original value on unmount so we don't accidentally break page scrolling
  // if multiple modals/components interact with body styles.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Store original overflow value
      const originalOverflow = document.body.style.overflow;
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Restore original overflow value to avoid leaving the page
        // non-scrollable after the modal closes.
        document.body.style.overflow = originalOverflow;
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle click outside modal to close
  const handleModalOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Unique classes to avoid removing unrelated overlays/content
  const OVERLAY_CLASS = "nutrition-modal-overlay";
  const CONTENT_CLASS = "nutrition-modal-content";

  // Internal save: writes nutrition goals to users/{uid} and verifies
  const handleSaveInternal = async () => {
    if (!user) {
      showLocalToast('Not authenticated', 'error');
      return;
    }

    if (!nutritionGoals) {
      showLocalToast('No goals to save', 'error');
      return;
    }

    setLocalLoading(true);

    // Build the object to persist (mirror parent construction)
    const macroTargets = {
      protein_percentage: proteinPercentage,
      carbs_percentage: carbsPercentage,
      fat_percentage: fatPercentage
    };

    const completeGoals: NutritionGoals = {
      ...nutritionGoals,
      current_weight: (currentWeight as any) || undefined,
      target_weight: (targetWeight as any) || undefined,
      height: (height as any) || undefined,
      macro_targets: macroTargets
    };

    try {
      const { db } = await resolveFirebase();
      const userDocRef = doc(db, 'users', user.uid);

      try {
        await updateDoc(userDocRef, {
          nutrition_goals: completeGoals,
          updated_at: new Date()
        });
      } catch (err) {
        // Fallback to set with merge if the document doesn't exist
        await setDoc(userDocRef, {
          nutrition_goals: completeGoals,
          updated_at: new Date()
        }, { merge: true });
      }

      // Re-read and verify
      const savedSnap = await getDoc(userDocRef);
      const saved = savedSnap.exists() ? (savedSnap.data() as any).nutrition_goals : null;

      if (saved && JSON.stringify(saved) === JSON.stringify(completeGoals)) {
        showLocalToast('Nutrition goals saved', 'success');
        // Let the parent refresh without navigating away
        if (onPersisted) onPersisted(completeGoals);

        // Important: do NOT call `onClose()` here. Let the parent update its
        // state (including `nutritionGoals`) and then close the modal. If we
        // call `onClose()` here the parent cancel/reset handler may read
        // stale `nutritionGoals` and overwrite newer values.

        // Restore body scrolling; don't remove portal nodes — React will
        // unmount them when the parent closes the modal.
        try {
          document.body.style.overflow = '';
        } catch (cleanupErr) {
          // Non-fatal
          // eslint-disable-next-line no-console
          console.warn('Nutrition modal cleanup (restore overflow) failed', cleanupErr);
        }
      } else {
        showLocalToast('Save verification failed — please try again', 'error');
      }
    } catch (err: any) {
      console.error('Failed to save nutrition goals in modal', err);
      showLocalToast(err?.message || 'Failed to save goals', 'error');
    } finally {
      setLocalLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className={`modal-overlay ${OVERLAY_CLASS}`}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={handleModalOverlayClick}
    >
      <div 
        className={`modal-content ${CONTENT_CLASS}`}
        style={{
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          margin: '1rem',
          transform: 'none',
          zIndex: 100001
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          className="modal-header"
          style={{
            padding: '1.5rem 2rem 1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2 
            className="modal-title"
            style={{
              color: '#e2e8f0',
              fontSize: '1.5rem',
              fontWeight: '600',
              margin: 0
            }}
          >
            Edit Nutrition Goals
          </h2>
          <button
            onClick={onClose}
            className="modal-close-button"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e2e8f0';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Local toast for modal-level messages */}
        <Toast
          message={toastMessage || ''}
          type={toastType}
          isVisible={showToast}
          onClose={() => setShowToast(false)}
        />

        {/* Modal Content */}
        <div 
          className="modal-body"
          style={{ padding: '2rem' }}
        >
          {validationErrors.length > 0 && (
            <div className="validation-errors" style={{ marginBottom: '1.5rem' }}>
              <h4>Please fix the following errors:</h4>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="nutrition-goals-editor">
            {/* Primary Goal Selection */}
            <div className="goal-selection-section">
              <div className="section-header-with-tooltip">
                <h3>What's your primary goal?</h3>
                <Tooltip 
                  content="Choose your main fitness objective. This will help tailor your nutrition plan and macro recommendations." 
                  example="If you select 'Weight Loss', we'll adjust your caloric and macro targets accordingly."
                />
              </div>
              <div className="goal-options-grid">
                {GOAL_OPTIONS.map(goal => (
                  <div
                    key={goal.id}
                    className={`goal-option-card ${nutritionGoals?.primary_goal === goal.id ? 'selected' : ''}`}
                    onClick={() => onGoalSelection(goal.id)}
                    style={{ 
                      background: nutritionGoals?.primary_goal === goal.id 
                        ? `${goal.color}15` 
                        : undefined,
                      borderColor: nutritionGoals?.primary_goal === goal.id 
                        ? goal.color 
                        : undefined,
                      boxShadow: nutritionGoals?.primary_goal === goal.id 
                        ? `0 4px 20px ${goal.color}30` 
                        : undefined
                    }}
                  >
                    <div 
                      className="goal-icon" 
                      style={{ color: goal.color }}
                    >
                      {goal.icon}
                    </div>
                    <h4>{goal.title}</h4>
                    <p>{goal.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Level Selection */}
            <div className="activity-level-section">
              <div className="section-header-with-tooltip">
                <h3>Activity Level</h3>
                <Tooltip 
                  content="Select how active you are on average. This helps calculate your daily caloric needs." 
                  example="If you exercise 3-5 times per week, choose 'Moderately Active'."
                />
              </div>
              <div className="activity-level-options">
                {ACTIVITY_LEVELS.map(level => (
                  <label 
                    key={level.id} 
                    className={`activity-level-option ${nutritionGoals?.activity_level === level.id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="activity_level"
                      value={level.id}
                      checked={nutritionGoals?.activity_level === level.id}
                      onChange={() => onActivityLevelChange(level.id)}
                    />
                    <div className="activity-level-content">
                      <strong>{level.label}</strong>
                      <p>{level.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Physical Metrics Section */}
            <div className="physical-metrics-section">
              <div className="section-header">
                <div className="section-header-with-tooltip">
                  <h3>Physical Metrics</h3>
                  <Tooltip 
                    content="Enter your current measurements to help calculate your personalized nutrition plan." 
                    example="Current weight 180lbs, target weight 165lbs helps determine your daily caloric goals."
                  />
                </div>
                <p>Enter your body measurements to personalize your nutrition plan.</p>
              </div>
              
              <div className="physical-metrics-grid">
                <div className="metric-card">
                  <div className="metric-card-header">
                    <h4 className="metric-card-title">Current Weight</h4>
                    <div className="metric-input-group">
                      <input
                        id="current-weight"
                        type="number"
                        value={currentWeight}
                        onChange={(e) => onCurrentWeightChange(e.target.value ? Number(e.target.value) : '')}
                        placeholder="0"
                        min="50"
                        max="500"
                        className="metric-input"
                      />
                      <span className="metric-unit">lbs</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-header">
                    <h4 className="metric-card-title">Target Weight</h4>
                    <div className="metric-input-group">
                      <input
                        id="target-weight"
                        type="number"
                        value={targetWeight}
                        onChange={(e) => onTargetWeightChange(e.target.value ? Number(e.target.value) : '')}
                        placeholder="0"
                        min="50"
                        max="500"
                        className="metric-input"
                      />
                      <span className="metric-unit">lbs</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-card-header">
                    <h4 className="metric-card-title">Height</h4>
                    <div className="metric-input-group">
                      <input
                        id="height"
                        type="number"
                        value={height}
                        onChange={(e) => onHeightChange(e.target.value ? Number(e.target.value) : '')}
                        placeholder="0"
                        min="36"
                        max="96"
                        className="metric-input"
                      />
                      <span className="metric-unit">in</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Macro Targets Section */}
            <div className="macro-targets-container">
              <div className="macro-targets-header">
                <div className="section-header-with-tooltip">
                  <h3 className="macro-targets-title">Macro Targets</h3>
                  <Tooltip 
                    content="Balance your protein, carbs, and fats to meet your nutritional needs. Total should equal 100%." 
                    example="A balanced split might be: 30% protein, 40% carbs, 30% fats"
                  />
                </div>
                <p className="macro-targets-description">Set your daily macronutrient distribution.</p>
              </div>
              
              <div className="macro-cards-container">
                {/* Protein Card */}
                <div className="macro-card protein">
                  <div className="macro-card-header">
                    <div className="macro-card-title-row">
                      <h4 className="macro-card-title">Protein</h4>
                      <div className="macro-percentage-badge protein">
                        {proteinPercentage}%
                      </div>
                    </div>
                  </div>
                  <div className="macro-slider-container">
                    <input
                      id="protein-slider"
                      type="range"
                      min="10"
                      max="50"
                      value={proteinPercentage}
                      onChange={(e) => onProteinChange(Number(e.target.value))}
                      className="macro-slider"
                    />
                    <div className="macro-slider-track">
                      <div 
                        className="macro-slider-progress protein"
                        style={{
                          width: `${((proteinPercentage - 10) / 40) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="macro-range-text">
                    10% - 50%
                  </div>
                </div>

                {/* Carbs Card */}
                <div className="macro-card carbs">
                  <div className="macro-card-header">
                    <div className="macro-card-title-row">
                      <h4 className="macro-card-title">Carbohydrates</h4>
                      <div className="macro-percentage-badge carbs">
                        {carbsPercentage}%
                      </div>
                    </div>
                  </div>
                  <div className="macro-slider-container">
                    <input
                      id="carbs-slider"
                      type="range"
                      min="20"
                      max="70"
                      value={carbsPercentage}
                      onChange={(e) => onCarbsChange(Number(e.target.value))}
                      className="macro-slider"
                    />
                    <div className="macro-slider-track">
                      <div 
                        className="macro-slider-progress carbs"
                        style={{
                          width: `${((carbsPercentage - 20) / 50) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="macro-range-text">
                    20% - 70%
                  </div>
                </div>

                {/* Fat Card */}
                <div className="macro-card fat">
                  <div className="macro-card-header">
                    <div className="macro-card-title-row">
                      <h4 className="macro-card-title">Fat</h4>
                      <div className="macro-percentage-badge fat">
                        {fatPercentage}%
                      </div>
                    </div>
                  </div>
                  <div className="macro-slider-container">
                    <input
                      id="fat-slider"
                      type="range"
                      min="15"
                      max="50"
                      value={fatPercentage}
                      onChange={(e) => onFatChange(Number(e.target.value))}
                      className="macro-slider"
                    />
                    <div className="macro-slider-track">
                      <div 
                        className="macro-slider-progress fat"
                        style={{
                          width: `${((fatPercentage - 15) / 35) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="macro-range-text">
                    15% - 50%
                  </div>
                </div>
              </div>
            </div>

            {/* Reset to Recommended Button */}
            {nutritionGoals?.primary_goal && (
              <div className="reset-button-container">
                <button
                  onClick={onResetToRecommended}
                  className="reset-button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                    <path d="M3 21v-5h5"/>
                  </svg>
                  Reset to Recommended
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div 
          className="modal-footer"
          style={{
            padding: '1rem 2rem 2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem'
          }}
        >
          <button 
            onClick={onClose} 
            className="cancel-section-button"
            disabled={loading}
          >
            Cancel
          </button>
          {/*
            The `Save` button delegates saving back to the parent via
            the provided `onSave` prop. Parent components should validate
            and persist data. Keep the button disabled while saving or
            when required fields/validation fail to avoid partial writes.
          */}
          <button 
            onClick={handleSaveInternal}
            className="save-section-button"
            disabled={localLoading || !nutritionGoals?.primary_goal || !nutritionGoals?.activity_level || Math.abs(totalPercentage - 100) > 1}
          >
            {localLoading ? 'Saving...' : 'Save Goals'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NutritionGoalsModal;