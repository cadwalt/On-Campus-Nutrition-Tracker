import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User } from 'firebase/auth';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { resolveFirebase } from '../../../lib/resolveFirebase';
import Toast from '../../ui/Toast';
import { Tooltip } from '../../ui';

interface AllergensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  selectedAllergens: string[];
  onAllergenChange: (allergen: string) => void;
  onPersisted?: (saved: { allergens?: string[] }) => void;
  user?: User;
}

const AllergensModal: React.FC<AllergensModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading,
  selectedAllergens,
  onAllergenChange
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
      console.groupCollapsed('AllergensModal: save start');
      console.log('userUid:', user.uid);
      console.log('selectedAllergens:', selectedAllergens);
      const { db } = await resolveFirebase();
      const userRef = doc(db, 'users', user.uid);
      const payload = { allergens: selectedAllergens, updated_at: new Date() };
      try {
        await updateDoc(userRef, payload);
      } catch (err) {
        await setDoc(userRef, payload, { merge: true });
      }
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : null;
      if (data && Array.isArray(data.allergens) && JSON.stringify(data.allergens) === JSON.stringify(selectedAllergens)) {
        showLocalToast('Allergens saved', 'success');
        if (onPersisted) onPersisted({ allergens: selectedAllergens });
        // Let parent close modal after it updates its state to avoid races
        try { document.body.style.overflow = ''; } catch (e) {}
      } else {
        showLocalToast('Save verification failed — please try again', 'error');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('AllergensModal: save failed', err);
      showLocalToast('Failed to save allergens', 'error');
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
        document.body.style.overflow = originalOverflow !== '' ? originalOverflow : '';
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

  // Top 9 allergens
  const ALLERGENS = [
    "Milk",
    "Eggs",
    "Fish",
    "Crustacean shellfish",
    "Tree nuts",
    "Peanuts",
    "Wheat",
    "Soybeans",
    "Sesame"
  ];

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
          maxWidth: '600px',
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
            Edit Allergens
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
          <div className="allergens-editor">
            <div className="section-header-with-tooltip">
              <h3 style={{
                color: '#e2e8f0',
                fontSize: '1.25rem',
                fontWeight: '600',
                margin: '0 0 1rem 0'
              }}>
                Food Allergens
              </h3>
              <Tooltip 
                content="Indicate any food allergies to ensure your safety. We'll exclude these ingredients from your meal suggestions." 
                example="If you're allergic to peanuts, we'll avoid recipes with peanuts and warn about potential cross-contamination."
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
                Select any allergens to help us provide better meal recommendations.
              </p>
            </div>
            
            <div 
              className="allergen-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                margin: '1rem 0'
              }}
            >
              {ALLERGENS.map(allergen => (
                <label 
                  key={allergen} 
                  className={`allergen-item ${selectedAllergens.includes(allergen) ? 'selected' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem',
                    background: selectedAllergens.includes(allergen) 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : 'rgba(17, 17, 27, 0.6)',
                    border: selectedAllergens.includes(allergen)
                      ? '2px solid rgba(239, 68, 68, 0.4)'
                      : '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedAllergens.includes(allergen)}
                    onChange={() => onAllergenChange(allergen)}
                    className="allergen-checkbox"
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#ef4444',
                      cursor: 'pointer',
                      flexShrink: '0'
                    }}
                  />
                  <span 
                    className="allergen-label"
                    style={{
                      color: selectedAllergens.includes(allergen) ? '#ef4444' : '#e2e8f0',
                      fontWeight: selectedAllergens.includes(allergen) ? '600' : '500',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      flex: '1'
                    }}
                  >
                    {allergen}
                  </span>
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
                {selectedAllergens.length > 0 
                  ? `${selectedAllergens.length} allergen${selectedAllergens.length > 1 ? 's' : ''} selected`
                  : 'No allergens selected'
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
            {loading ? 'Saving...' : 'Save Allergens'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AllergensModal;
