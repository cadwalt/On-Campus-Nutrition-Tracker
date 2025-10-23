import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CookingSkill } from '../../../types/nutrition';
import { COOKING_SKILLS } from '../../../constants/nutrition';

interface MealPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  validationErrors: string[];
  cookingSkill: CookingSkill | null;
  mealFrequency: number;
  onSkillChange: (skill: CookingSkill) => void;
  onMealFrequencyChange: (frequency: number) => void;
}

const MealPreferencesModal: React.FC<MealPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading,
  validationErrors,
  cookingSkill,
  mealFrequency,
  onSkillChange,
  onMealFrequencyChange
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
        document.body.style.overflow = originalOverflow || '';
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
          maxWidth: '700px',
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
            Edit Meal Preferences
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
          <div className="meal-preferences-editor">
            {validationErrors.length > 0 && (
              <div 
                className="validation-errors"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                <h4 style={{ 
                  color: '#ef4444', 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  margin: '0 0 0.5rem 0' 
                }}>
                  Please fix the following errors:
                </h4>
                <ul style={{ 
                  color: '#ef4444', 
                  fontSize: '0.9rem', 
                  margin: '0', 
                  paddingLeft: '1.5rem' 
                }}>
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div 
              className="section-description"
              style={{ marginBottom: '1.5rem' }}
            >
              <p style={{ 
                color: '#d1d5db', 
                fontSize: '0.95rem', 
                lineHeight: '1.5', 
                margin: '0', 
                opacity: '0.9' 
              }}>
                Set your cooking skill level and meal frequency to help us provide better meal planning recommendations.
              </p>
            </div>

            {/* Cooking Skill Section */}
            <div 
              className="cooking-skill-section"
              style={{ marginBottom: '2rem' }}
            >
              <h3 style={{
                color: '#e2e8f0',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: '0 0 1rem 0'
              }}>
                Cooking Skill Level
              </h3>
              
              <div 
                className="cooking-skill-options"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                {COOKING_SKILLS.map(skill => (
                  <label 
                    key={skill.id} 
                    className={`cooking-skill-option ${cookingSkill === skill.id ? 'selected' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: cookingSkill === skill.id 
                        ? 'rgba(245, 158, 11, 0.1)' 
                        : 'rgba(26, 26, 46, 0.6)',
                      border: cookingSkill === skill.id
                        ? '1px solid #f59e0b'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative'
                    }}
                  >
                    <input
                      type="radio"
                      name="cooking_skill"
                      value={skill.id}
                      checked={cookingSkill === skill.id}
                      onChange={() => onSkillChange(skill.id as CookingSkill)}
                      className="cooking-skill-radio"
                      style={{
                        margin: '0',
                        accentColor: '#f59e0b'
                      }}
                    />
                    <div 
                      className="cooking-skill-content"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flex: '1'
                      }}
                    >
                      <div 
                        className="skill-icon"
                        style={{
                          fontSize: '1.5rem',
                          width: '2.5rem',
                          height: '2.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(245, 158, 11, 0.1)',
                          borderRadius: '50%',
                          border: '2px solid rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        {skill.id === 'beginner' && '👶'}
                        {skill.id === 'intermediate' && '👨‍🍳'}
                        {skill.id === 'advanced' && '👨‍💼'}
                      </div>
                      <div 
                        className="skill-details"
                        style={{ flex: '1' }}
                      >
                        <strong style={{
                          color: '#e2e8f0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          display: 'block',
                          marginBottom: '0.25rem'
                        }}>
                          {skill.label}
                        </strong>
                        <p style={{
                          color: '#94a3b8',
                          fontSize: '0.85rem',
                          margin: '0'
                        }}>
                          {skill.description}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Meal Frequency Section */}
            <div 
              className="meal-frequency-section"
              style={{ marginBottom: '1rem' }}
            >
              <h3 style={{
                color: '#e2e8f0',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: '0 0 1rem 0'
              }}>
                Meal Frequency
              </h3>
              
              <div 
                className="frequency-selector"
                style={{
                  background: 'rgba(26, 26, 46, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1rem'
                }}
              >
                <label 
                  htmlFor="meal-frequency-slider"
                  style={{
                    display: 'block',
                    color: '#e2e8f0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    marginBottom: '1rem'
                  }}
                >
                  Meals per day: <span style={{ color: '#8b5cf6' }}>{mealFrequency}</span>
                </label>
                
                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <input
                    id="meal-frequency-slider"
                    type="range"
                    min="1"
                    max="8"
                    value={mealFrequency}
                    onChange={(e) => onMealFrequencyChange(Number(e.target.value))}
                    className="frequency-slider"
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: 'transparent',
                      outline: 'none',
                      WebkitAppearance: 'none',
                      position: 'relative',
                      zIndex: '2'
                    }}
                  />
                  <div 
                    className="slider-track"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '0',
                      right: '0',
                      height: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      transform: 'translateY(-50%)',
                      zIndex: '1'
                    }}
                  >
                    <div 
                      className="slider-progress"
                      style={{
                        height: '100%',
                        borderRadius: '4px',
                        transition: 'width 0.2s ease',
                        background: 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%)',
                        width: `${((mealFrequency - 1) / 7) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div 
                  className="frequency-range"
                  style={{
                    color: '#64748b',
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    fontWeight: '400'
                  }}
                >
                  1 - 8 meals per day
                </div>
              </div>
            </div>
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
            style={{
              background: 'rgba(107, 114, 128, 0.8)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(107, 114, 128, 1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(107, 114, 128, 0.8)';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            Cancel
          </button>
          <button 
            onClick={onSave} 
            className="save-section-button"
            disabled={loading || !cookingSkill}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!loading && cookingSkill) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && cookingSkill) {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.3)';
              }
            }}
          >
            {loading ? 'Saving...' : 'Save Meal Preferences'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MealPreferencesModal;
