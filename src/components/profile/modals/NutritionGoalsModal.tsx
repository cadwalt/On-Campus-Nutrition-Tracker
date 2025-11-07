import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  onSave: () => void;
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
}

const NutritionGoalsModal: React.FC<NutritionGoalsModalProps> = ({
  isOpen,
  onClose,
  onSave,
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
  onResetToRecommended
}) => {
  // Handle ESC key to close modal and body scroll management
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
        // Restore original overflow value
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

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="modal-overlay"
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
        className="modal-content"
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
          <button 
            onClick={onSave} 
            className="save-section-button"
            disabled={loading || !nutritionGoals?.primary_goal || !nutritionGoals?.activity_level || Math.abs(totalPercentage - 100) > 1}
          >
            {loading ? 'Saving...' : 'Save Goals'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NutritionGoalsModal;