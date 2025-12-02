import React, { useState, useEffect } from 'react';

const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import('firebase/firestore');
  return { db, firestore };
};
import type { User } from 'firebase/auth';
import type { CookingSkill, NutritionGoals } from '../../types/nutrition';
import { COOKING_SKILLS } from '../../constants/nutrition';
import MealPreferencesModal from './modals/MealPreferencesModal';
import { Tooltip } from '../ui';

interface MealPreferencesSectionProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const MealPreferencesSection: React.FC<MealPreferencesSectionProps> = ({ 
  user, 
  onSuccess, 
  onError 
}) => {
  const [cookingSkill, setCookingSkill] = useState<CookingSkill | null>(null);
  const [mealFrequency, setMealFrequency] = useState<number>(3);
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Load existing meal preferences from Firestore
  useEffect(() => {
    const loadMealPreferences = async () => {
      if (user) {
        try {
          const { db, firestore } = await resolveFirebase();
          const userDocRef = firestore.doc(db, 'users', user.uid);
          const userDocSnap = await firestore.getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const goals = data.nutrition_goals;
            setNutritionGoals(goals || null);
            setCookingSkill(goals?.preferences?.cooking_skill || null);
            setMealFrequency(goals?.preferences?.meal_frequency || 3);
          }
        } catch (error) {
          console.error('Error loading meal preferences:', error);
        }
      }
    };
    loadMealPreferences();
  }, [user]);

  // Handle cooking skill selection
  const handleSkillChange = (skill: CookingSkill) => {
    setCookingSkill(skill);
  };

  // Validate meal preferences
  const validateMealPreferences = () => {
    const errors: string[] = [];

    if (!cookingSkill) {
      errors.push('Please select a cooking skill level');
    }

    if (mealFrequency < 1 || mealFrequency > 8) {
      errors.push('Meal frequency should be between 1 and 8 meals per day');
    }

    return errors;
  };

  // Save meal preferences to Firestore
  const handleSavePreferences = async () => {
    if (!user) return;

    const errors = validateMealPreferences();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    setValidationErrors([]);

    try {
      const { db, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(db, 'users', user.uid);

      // Get current nutrition goals and update meal preferences
      const userDocSnap = await firestore.getDoc(userDocRef);
      const currentData = userDocSnap.exists() ? userDocSnap.data() : {};
      const currentNutritionGoals = currentData.nutrition_goals || {};

      const updatedGoals: NutritionGoals = {
        ...currentNutritionGoals,
        preferences: {
          ...currentNutritionGoals.preferences,
          cooking_skill: cookingSkill!,
          meal_frequency: mealFrequency,
          dietary_restrictions: currentNutritionGoals.preferences?.dietary_restrictions || []
        },
        primary_goal: currentNutritionGoals.primary_goal || 'general_health',
        activity_level: currentNutritionGoals.activity_level || 'moderately_active'
      };

      await firestore.updateDoc(userDocRef, {
        nutrition_goals: updatedGoals,
        updated_at: new Date()
      });
      
      setNutritionGoals(updatedGoals);
      onSuccess('Meal preferences saved successfully!');
      setIsEditing(false);
    } catch (error: any) {
      onError(error.message || 'Failed to save meal preferences');
    } finally {
      setLoading(false);
    }
  };

  // Called by modal after it verifies persistence
  function handlePersistedPreferences(saved: { cooking_skill?: any; meal_frequency?: number }) {
    console.groupCollapsed('MealPreferencesSection: handlePersistedPreferences');
    console.log('saved:', saved);
    if (saved.cooking_skill !== undefined) setCookingSkill(saved.cooking_skill);
    if (saved.meal_frequency !== undefined) setMealFrequency(saved.meal_frequency);
    try { document.body.style.overflow = ''; } catch (e) {}
    // Merge saved preferences into the in-memory nutritionGoals so the
    // display reads the updated nested values consistently.
    setNutritionGoals(prev => ({
      ...(prev || {}),
      preferences: {
        ...((prev && prev.preferences) || {}),
        ...(saved.cooking_skill !== undefined ? { cooking_skill: saved.cooking_skill } : {}),
        ...(saved.meal_frequency !== undefined ? { meal_frequency: saved.meal_frequency } : {})
      }
    }));

    onSuccess('Meal preferences saved successfully!');
    setIsEditing(false);
    console.groupEnd();
  }

  // Cancel editing and reset to original state
  const handleCancelEdit = () => {
    setIsEditing(false);
    setValidationErrors([]);
    setCookingSkill(nutritionGoals?.preferences?.cooking_skill || null);
    setMealFrequency(nutritionGoals?.preferences?.meal_frequency || 3);
  };

  // Start editing mode
  const handleStartEdit = () => {
    setIsEditing(true);
    setValidationErrors([]);
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <div className="header-with-tooltip">
          <h2>Meal Preferences</h2>
          <Tooltip content="Customize your meal planning by setting your cooking experience level and preferred daily meal frequency." />
        </div>
        {!isEditing && (
          <button 
            className="edit-section-button" 
            onClick={handleStartEdit}
            title="Edit meal preferences"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="profile-card">
        {/* Meal Preferences Modal */}
        <MealPreferencesModal
          isOpen={isEditing}
          onClose={handleCancelEdit}
          onSave={handleSavePreferences}
          onPersisted={handlePersistedPreferences}
          user={user}
          loading={loading}
          validationErrors={validationErrors}
          cookingSkill={cookingSkill}
          mealFrequency={mealFrequency}
          onSkillChange={handleSkillChange}
          onMealFrequencyChange={setMealFrequency}
        />

        {!isEditing && (
          <div className="meal-preferences-display">
            {(cookingSkill || nutritionGoals?.preferences?.meal_frequency) ? (
              <div 
                className="preferences-summary"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div 
                  className="preferences-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem'
                  }}
                >
                  {/* Cooking Skill Card */}
                  {cookingSkill && (
                    <div 
                      className="preference-card cooking-skill"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.5rem',
                        background: 'rgba(26, 26, 46, 0.6)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div 
                        className="preference-icon"
                        style={{
                          fontSize: '2rem',
                          width: '3rem',
                          height: '3rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(245, 158, 11, 0.1)',
                          borderRadius: '50%',
                          border: '2px solid rgba(245, 158, 11, 0.3)',
                          flexShrink: '0'
                        }}
                      >
                        {cookingSkill === 'beginner' && '👶'}
                        {cookingSkill === 'intermediate' && '👨‍🍳'}
                        {cookingSkill === 'advanced' && '👨‍💼'}
                      </div>
                      <div 
                        className="preference-info"
                        style={{ flex: '1' }}
                      >
                        <h3 
                          style={{
                            color: '#e2e8f0',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            margin: '0 0 0.25rem 0'
                          }}
                        >
                          Cooking Skill
                        </h3>
                        <p 
                          style={{
                            color: '#94a3b8',
                            fontSize: '0.95rem',
                            margin: '0',
                            fontWeight: '500'
                          }}
                        >
                          {COOKING_SKILLS.find(s => s.id === cookingSkill)?.label}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Meal Frequency Card */}
                  {nutritionGoals?.preferences?.meal_frequency && (
                    <div 
                      className="preference-card meal-frequency"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1.5rem',
                        background: 'rgba(26, 26, 46, 0.6)',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        borderRadius: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div 
                        className="preference-icon"
                        style={{
                          fontSize: '1.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(139, 92, 246, 0.1)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          border: '2px solid rgba(139, 92, 246, 0.3)',
                          flexShrink: '0',
                          minWidth: '3rem'
                        }}
                      >
                        {'🍽️'}
                      </div>
                      <div 
                        className="preference-info"
                        style={{ flex: '1' }}
                      >
                        <h3 
                          style={{
                            color: '#e2e8f0',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            margin: '0 0 0.25rem 0'
                          }}
                        >
                          Meal Frequency
                        </h3>
                        <p 
                          style={{
                            color: '#94a3b8',
                            fontSize: '0.95rem',
                            margin: '0',
                            fontWeight: '500'
                          }}
                        >
                          {nutritionGoals.preferences.meal_frequency === 1 ? `${nutritionGoals.preferences.meal_frequency} meal per day` : `${nutritionGoals.preferences.meal_frequency} meals per day`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="no-preferences-set"
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#94a3b8',
                  fontSize: '1rem'
                }}
              >
                <p style={{ margin: '0' }}>No meal preferences set yet. Click "Edit" to get started!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPreferencesSection;
