import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { resolveFirebase } from '../../../lib/resolveFirebase';
import Toast from '../../ui/Toast';
import type { DietaryRestriction } from '../../../types/nutrition';
import { DIETARY_RESTRICTIONS } from '../../../constants/nutrition';
import { Tooltip } from '../../ui';

interface DietaryRestrictionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  selectedRestrictions: DietaryRestriction[];
  onRestrictionChange: (restriction: DietaryRestriction) => void;
  onPersisted?: (saved: { dietary_restrictions?: DietaryRestriction[] }) => void;
  user?: User;
}

const DietaryRestrictionsModal: React.FC<DietaryRestrictionsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading,
  selectedRestrictions,
  onRestrictionChange
  , onPersisted, user
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

  const handleSaveInternal = async () => {
    if (!user) return onSave();
    setLocalLoading(true);
    try {
      console.groupCollapsed('DietaryRestrictionsModal: save start');
      console.log('userUid:', user.uid);
      console.log('selectedRestrictions:', selectedRestrictions);
      const { db } = await resolveFirebase();
      const userRef = doc(db, 'users', user.uid);

      // Read existing document and merge dietary restrictions under nutrition_goals.preferences
      const beforeSnap = await getDoc(userRef);
      const current = beforeSnap.exists() ? (beforeSnap.data() as any) : {};
      const currentNutritionGoals = current.nutrition_goals || {};

      const updatedGoals = {
        ...currentNutritionGoals,
        preferences: {
          ...(currentNutritionGoals.preferences || {}),
          dietary_restrictions: selectedRestrictions
        }
      };

      try {
        await updateDoc(userRef, {
          nutrition_goals: updatedGoals,
          updated_at: new Date()
        });
      } catch (err) {
        await setDoc(userRef, {
          nutrition_goals: updatedGoals,
          updated_at: new Date()
        }, { merge: true });
      }

      const snap = await getDoc(userRef);
      const data = snap.exists() ? (snap.data() as any) : null;
      const savedRestrictions = data?.nutrition_goals?.preferences?.dietary_restrictions ?? null;

      if (Array.isArray(savedRestrictions) && JSON.stringify(savedRestrictions) === JSON.stringify(selectedRestrictions)) {
        showLocalToast('Dietary restrictions saved', 'success');
        if (onPersisted) onPersisted({ dietary_restrictions: savedRestrictions });
        // Let parent close modal after it updates local state to avoid races
        try { document.body.style.overflow = ''; } catch (e) {}
      } else {
        showLocalToast('Save verification failed — please try again', 'error');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('DietaryRestrictionsModal: save failed', err);
      showLocalToast('Failed to save restrictions', 'error');
    } finally {
      setLocalLoading(false);
      try { console.groupEnd(); } catch (e) {}
    }
  };
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
        document.body.style.overflow = originalOverflow === '' ? '' : originalOverflow;
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
            Edit Dietary Restrictions
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
          {/* Local toast for modal-level messages */}
          <Toast
            message={toastMessage || ''}
            type={toastType}
            isVisible={showToast}
            onClose={() => setShowToast(false)}
          />
          <div className="dietary-restrictions-editor">
            <div className="section-header-with-tooltip">
              <h3 style={{
                color: '#e2e8f0',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: '0 0 1rem 0'
              }}>
                Dietary Preferences
              </h3>
              <Tooltip 
                content="Select any specific dietary preferences or restrictions that apply to you." 
                example="Choose 'Vegetarian' to exclude meat, 'Gluten-Free' for celiac diet, etc."
              />
            </div>
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
                Select any dietary restrictions to help us provide better meal recommendations.
              </p>
            </div>
            
            <div 
              className="dietary-restrictions-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem'
              }}
            >
              {DIETARY_RESTRICTIONS.map(restriction => (
                <label 
                  key={restriction.id} 
                  className={`dietary-restriction-item ${selectedRestrictions.includes(restriction.id as DietaryRestriction) ? 'selected' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: selectedRestrictions.includes(restriction.id as DietaryRestriction) 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(26, 26, 46, 0.6)',
                    border: selectedRestrictions.includes(restriction.id as DietaryRestriction)
                      ? '1px solid #10b981'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRestrictions.includes(restriction.id as DietaryRestriction)}
                    onChange={() => onRestrictionChange(restriction.id as DietaryRestriction)}
                    className="dietary-restriction-checkbox"
                    style={{
                      margin: '0',
                      accentColor: '#10b981'
                    }}
                  />
                  <div 
                    className="dietary-restriction-content"
                    style={{ flex: '1' }}
                  >
                    <strong style={{
                      color: '#e2e8f0',
                      fontSize: '1rem',
                      fontWeight: '600'
                    }}>
                      {restriction.label}
                    </strong>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.9rem',
                      margin: '0.25rem 0 0 0'
                    }}>
                      {restriction.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            
            <div 
              className="section-actions"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <span 
                className="section-status"
                style={{
                  color: '#9ca3af',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  fontStyle: 'italic'
                }}
              >
                {selectedRestrictions.length > 0 
                  ? `${selectedRestrictions.length} restriction${selectedRestrictions.length > 1 ? 's' : ''} selected`
                  : 'No restrictions selected'
                }
              </span>
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
            onClick={handleSaveInternal} 
            className="save-section-button"
            disabled={localLoading || loading}
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
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.3)';
              }
            }}
          >
            {loading ? 'Saving...' : 'Save Restrictions'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DietaryRestrictionsModal;