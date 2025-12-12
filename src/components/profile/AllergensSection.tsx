import React, { useState, useEffect } from 'react';

// runtime-resolve firebase to avoid bundling
const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import('firebase/firestore');
  return { db, firestore };
};
import type { User } from 'firebase/auth';
import AllergensModal from './modals/AllergensModal';
import { Tooltip } from '../ui';

interface AllergensSectionProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const AllergensSection: React.FC<AllergensSectionProps> = ({ user, onSuccess, onError }) => {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAllergens = async () => {
      if (user) {
        try {
          const { db, firestore } = await resolveFirebase();
          const userDocRef = firestore.doc(db, 'users', user.uid);
          const userDocSnap = await firestore.getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setSelectedAllergens(data.allergens || []);
          }
        } catch (error) {
          console.error('Error loading allergens:', error);
        }
      }
    };
    loadAllergens();
  }, [user]);

  const handleAllergenChange = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSaveAllergens = async () => {
    if (!user) return;
    
      setLoading(true);
    try {
      const { db, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(db, 'users', user.uid);
      await firestore.updateDoc(userDocRef, {
        allergens: selectedAllergens,
        updated_at: new Date()
      });
      onSuccess('Allergens saved successfully!');
      setIsEditing(false);
    } catch (error: any) {
      onError(error.message || 'Failed to save allergens');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing and reset to original state
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reload original data
    const loadOriginalAllergens = async () => {
      if (user) {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setSelectedAllergens(data.allergens || []);
        }
      }
    };
    loadOriginalAllergens();
  };

  // Start editing mode
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Called by modal after it verifies persistence
  function handlePersistedAllergens(saved: { allergens?: string[] }) {
    console.groupCollapsed('AllergensSection: handlePersistedAllergens');
    console.log('saved:', saved);
    if (saved.allergens !== undefined) setSelectedAllergens(saved.allergens);
    try { document.body.style.overflow = ''; } catch (e) {}
    onSuccess('Allergens saved successfully!');
    setIsEditing(false);
    console.groupEnd();
  }

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="header-with-tooltip">
          <h2>Allergens</h2>
          <Tooltip content="Specify your food allergies and dietary restrictions to ensure safe and suitable meal recommendations." />
        </div>
        {!isEditing && (
          <button 
            className="edit-section-button" 
            onClick={handleStartEdit}
            title="Edit allergens"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="profile-card">
        {/* Allergens Modal */}
        <AllergensModal
          isOpen={isEditing}
          onClose={handleCancelEdit}
          onSave={handleSaveAllergens}
          onPersisted={handlePersistedAllergens}
          user={user}
          loading={loading}
          selectedAllergens={selectedAllergens}
          onAllergenChange={handleAllergenChange}
        />

        {!isEditing && (
          <div className="allergens-display">
            {selectedAllergens.length > 0 ? (
              <div className="allergens-summary">
                <div className="allergens-list">
                  {selectedAllergens.map(allergen => (
                    <div key={allergen} className="allergen-tag">
                      <span className="allergen-label">{allergen}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p>No allergens selected.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllergensSection;
