import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { User } from 'firebase/auth';
import AllergensModal from './modals/AllergensModal';

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
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
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
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
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
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
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

  return (
    <div className="profile-section">
      <div className="section-header">
        <h2>Allergens</h2>
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
