import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from 'firebase/auth';

interface AllergensSectionProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const AllergensSection: React.FC<AllergensSectionProps> = ({ user, onSuccess, onError }) => {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

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

  useEffect(() => {
    const loadAllergens = async () => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setSelectedAllergens(data.allergens || []);
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
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        allergens: selectedAllergens,
        updated_at: new Date()
      });
      onSuccess('Allergens saved successfully!');
    } catch (error: any) {
      onError(error.message || 'Failed to save allergens');
    }
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <h2>Dietary Restrictions</h2>
      </div>
      <div className="profile-card">
        <div className="allergen-section">
          <div className="section-description">
            <p>Select any allergens to help us provide better meal recommendations.</p>
          </div>
          
          <div className="allergen-grid">
            {ALLERGENS.map(allergen => (
              <label key={allergen} className="allergen-item">
                <input
                  type="checkbox"
                  checked={selectedAllergens.includes(allergen)}
                  onChange={() => handleAllergenChange(allergen)}
                  className="allergen-checkbox"
                />
                <span className="allergen-label">{allergen}</span>
              </label>
            ))}
          </div>
          
          <div className="section-actions">
            <button onClick={handleSaveAllergens} className="save-section-button">
              Save Allergens
            </button>
            <span className="section-status">
              {selectedAllergens.length > 0 
                ? `${selectedAllergens.length} allergen${selectedAllergens.length > 1 ? 's' : ''} selected`
                : 'No allergens selected'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllergensSection;
