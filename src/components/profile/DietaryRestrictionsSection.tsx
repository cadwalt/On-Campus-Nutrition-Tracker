import React, { useState, useEffect } from 'react';

const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import('firebase/firestore');
  return { db, firestore };
};
import type { User } from 'firebase/auth';
import type { DietaryRestriction } from '../../types/nutrition';
import { DIETARY_RESTRICTIONS } from '../../constants/nutrition';
import DietaryRestrictionsModal from './modals/DietaryRestrictionsModal';
import { Tooltip } from '../ui';

interface DietaryRestrictionsSectionProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const DietaryRestrictionsSection: React.FC<DietaryRestrictionsSectionProps> = ({ 
  user, 
  onSuccess, 
  onError 
}) => {
  const [selectedRestrictions, setSelectedRestrictions] = useState<DietaryRestriction[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load existing dietary restrictions from Firestore
  useEffect(() => {
    const loadDietaryRestrictions = async () => {
      if (user) {
        try {
          const { db, firestore } = await resolveFirebase();
          const userDocRef = firestore.doc(db, 'users', user.uid);
          const userDocSnap = await firestore.getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const nutritionGoals = data.nutrition_goals;
            setSelectedRestrictions(nutritionGoals?.preferences?.dietary_restrictions || []);
          }
        } catch (error) {
          console.error('Error loading dietary restrictions:', error);
        }
      }
    };
    loadDietaryRestrictions();
  }, [user]);

  // Handle dietary restriction toggle
  const handleRestrictionChange = (restriction: DietaryRestriction) => {
    setSelectedRestrictions(prev =>
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  // Save dietary restrictions to Firestore
  const handleSaveRestrictions = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { db, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(db, 'users', user.uid);

      // Get current nutrition goals and update dietary restrictions
      const userDocSnap = await firestore.getDoc(userDocRef);
      const currentData = userDocSnap.exists() ? userDocSnap.data() : {};
      const currentNutritionGoals = currentData.nutrition_goals || {};

      await firestore.updateDoc(userDocRef, {
        nutrition_goals: {
          ...currentNutritionGoals,
          preferences: {
            ...currentNutritionGoals.preferences,
            dietary_restrictions: selectedRestrictions
          }
        },
        updated_at: new Date()
      });
      
      onSuccess('Dietary restrictions saved successfully!');
      setIsEditing(false);
    } catch (error: any) {
      onError(error.message || 'Failed to save dietary restrictions');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing and reset to original state
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reload original data
    const loadOriginalRestrictions = async () => {
      if (user) {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const nutritionGoals = data.nutrition_goals;
          setSelectedRestrictions(nutritionGoals?.preferences?.dietary_restrictions || []);
        }
      }
    };
    loadOriginalRestrictions();
  };

  // Start editing mode
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Called by modal after it verifies persistence
  function handlePersistedRestrictions(saved: { dietary_restrictions?: any[] }) {
    console.groupCollapsed('DietaryRestrictionsSection: handlePersistedRestrictions');
    console.log('saved:', saved);
    if (saved.dietary_restrictions !== undefined) setSelectedRestrictions(saved.dietary_restrictions);
    try { document.body.style.overflow = ''; } catch (e) {}
    onSuccess('Dietary restrictions saved successfully!');
    setIsEditing(false);
    console.groupEnd();
  }

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="header-with-tooltip">
          <h2>Dietary Restrictions</h2>
          <Tooltip content="Set your dietary preferences such as vegetarian, vegan, kosher, or any specific food restrictions to personalize your meal options." />
        </div>
        {!isEditing && (
          <button 
            className="edit-section-button" 
            onClick={handleStartEdit}
            title="Edit dietary restrictions"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="profile-card">
        {/* Dietary Restrictions Modal */}
        <DietaryRestrictionsModal
          isOpen={isEditing}
          onClose={handleCancelEdit}
          onSave={handleSaveRestrictions}
          onPersisted={handlePersistedRestrictions}
          user={user}
          loading={loading}
          selectedRestrictions={selectedRestrictions}
          onRestrictionChange={handleRestrictionChange}
        />

        {!isEditing && (
          <div className="dietary-restrictions-display">
            {selectedRestrictions.length > 0 ? (
              <div className="restrictions-summary">
                <div className="restrictions-list">
                  {selectedRestrictions.map(restriction => {
                    const restrictionData = DIETARY_RESTRICTIONS.find(r => r.id === restriction);
                    return (
                      <div key={restriction} className="restriction-tag">
                        <span className="restriction-label">{restrictionData?.label}</span>
                        <span className="restriction-description">{restrictionData?.description}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <p>No dietary restrictions set.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DietaryRestrictionsSection;
