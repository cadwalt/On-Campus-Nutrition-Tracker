import React, { useState, useEffect } from 'react';

const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const db = (mod.getFirestoreClient ? await mod.getFirestoreClient() : mod.db) as any;
  const firestore = await import('firebase/firestore');
  return { db, firestore };
};
import type { User } from 'firebase/auth';
import type { 
  NutritionGoals, 
  PrimaryGoal, 
  ActivityLevel,
  MacroTargets
} from '../../types/nutrition';
import { 
  GOAL_OPTIONS, 
  ACTIVITY_LEVELS, 
  validateNutritionGoals 
} from '../../constants/nutrition';
import { validatePhysicalMetricsValues } from './nutritionValidation'; // import helper from same folder
import NutritionGoalsModal from './modals/NutritionGoalsModal';
import { Tooltip } from '../ui';

interface NutritionGoalsSectionProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const NutritionGoalsSection: React.FC<NutritionGoalsSectionProps> = ({ 
  user, 
  onSuccess, 
  onError 
}) => {
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Form state for physical metrics
  const [currentWeight, setCurrentWeight] = useState<number | ''>('');
  const [targetWeight, setTargetWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');

  // Form state for macro targets
  const [proteinPercentage, setProteinPercentage] = useState<number>(25);
  const [carbsPercentage, setCarbsPercentage] = useState<number>(45);
  const [fatPercentage, setFatPercentage] = useState<number>(30);

  // Load existing nutrition goals from Firestore
  useEffect(() => {
    const loadNutritionGoals = async () => {
      if (user) {
        try {
          const { db, firestore } = await resolveFirebase();
          const userDocRef = firestore.doc(db, 'users', user.uid);
          const userDocSnap = await firestore.getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const goals = data.nutrition_goals;
            setNutritionGoals(goals || null);
            
            // Load physical metrics
            setCurrentWeight(goals?.current_weight || '');
            setTargetWeight(goals?.target_weight || '');
            setHeight(goals?.height || '');
            
            // Load macro targets
            if (goals?.macro_targets) {
              setProteinPercentage(goals.macro_targets.protein_percentage);
              setCarbsPercentage(goals.macro_targets.carbs_percentage);
              setFatPercentage(goals.macro_targets.fat_percentage);
            }
          }
        } catch (error) {
          console.error('Error loading nutrition goals:', error);
        }
      }
    };
    loadNutritionGoals();
  }, [user]);

  // Handle primary goal selection
  const handleGoalSelection = (goalId: PrimaryGoal) => {
    const selectedGoal = GOAL_OPTIONS.find(goal => goal.id === goalId);
    if (!selectedGoal) return;

    setNutritionGoals(prev => ({
      ...prev,
      primary_goal: goalId,
      activity_level: prev?.activity_level || 'moderately_active',
      macro_targets: selectedGoal.recommended_macro_split || prev?.macro_targets
    }));
  };

  // Handle activity level selection
  const handleActivityLevelChange = (activityLevel: ActivityLevel) => {
    setNutritionGoals(prev => ({
      ...prev,
      activity_level: activityLevel,
      primary_goal: prev?.primary_goal || 'general_health'
    }));
  };

  // Calculate total percentage for macro targets
  const totalPercentage = proteinPercentage + carbsPercentage + fatPercentage;

  // Validate physical metrics (delegates to a testable helper)
  const validatePhysicalMetrics = () =>
    validatePhysicalMetricsValues({
      currentWeight,
      targetWeight,
      height,
      primaryGoal: nutritionGoals?.primary_goal
    });

  // Validate macro targets
  const validateMacroTargets = () => {
    const errors: string[] = [];

    if (Math.abs(totalPercentage - 100) > 1) {
      errors.push('Macro percentages must add up to 100%');
    }

    if (proteinPercentage < 10 || proteinPercentage > 50) {
      errors.push('Protein percentage should be between 10% and 50%');
    }

    if (carbsPercentage < 20 || carbsPercentage > 70) {
      errors.push('Carb percentage should be between 20% and 70%');
    }

    if (fatPercentage < 15 || fatPercentage > 50) {
      errors.push('Fat percentage should be between 15% and 50%');
    }

    return errors;
  };

  // Handle macro slider changes
  const handleProteinChange = (value: number) => {
    const remaining = 100 - value;
    const currentCarbs = carbsPercentage;
    const currentFat = fatPercentage;
    const totalOther = currentCarbs + currentFat;
    
    if (totalOther > 0) {
      const carbsRatio = currentCarbs / totalOther;
      const fatRatio = currentFat / totalOther;
      const remainingCarbs = remaining * carbsRatio;
      const remainingFat = remaining * fatRatio;
      
      setProteinPercentage(value);
      setCarbsPercentage(Math.round(remainingCarbs));
      setFatPercentage(Math.round(remainingFat));
    } else {
      setProteinPercentage(value);
      setCarbsPercentage(Math.round(remaining / 2));
      setFatPercentage(Math.round(remaining / 2));
    }
  };

  const handleCarbsChange = (value: number) => {
    const remaining = 100 - value;
    const currentProtein = proteinPercentage;
    const currentFat = fatPercentage;
    const totalOther = currentProtein + currentFat;
    
    if (totalOther > 0) {
      const proteinRatio = currentProtein / totalOther;
      const fatRatio = currentFat / totalOther;
      const remainingProtein = remaining * proteinRatio;
      const remainingFat = remaining * fatRatio;
      
      setCarbsPercentage(value);
      setProteinPercentage(Math.round(remainingProtein));
      setFatPercentage(Math.round(remainingFat));
    } else {
      setCarbsPercentage(value);
      setProteinPercentage(Math.round(remaining / 2));
      setFatPercentage(Math.round(remaining / 2));
    }
  };

  const handleFatChange = (value: number) => {
    const remaining = 100 - value;
    const currentProtein = proteinPercentage;
    const currentCarbs = carbsPercentage;
    const totalOther = currentProtein + currentCarbs;
    
    if (totalOther > 0) {
      const proteinRatio = currentProtein / totalOther;
      const carbsRatio = currentCarbs / totalOther;
      const remainingProtein = remaining * proteinRatio;
      const remainingCarbs = remaining * carbsRatio;
      
      setFatPercentage(value);
      setProteinPercentage(Math.round(remainingProtein));
      setCarbsPercentage(Math.round(remainingCarbs));
    } else {
      setFatPercentage(value);
      setProteinPercentage(Math.round(remaining / 2));
      setCarbsPercentage(Math.round(remaining / 2));
    }
  };

  // Reset macro targets to recommended values for selected goal
  const handleResetToRecommended = () => {
    if (!nutritionGoals?.primary_goal) return;
    
    const selectedGoal = GOAL_OPTIONS.find(goal => goal.id === nutritionGoals.primary_goal);
    if (selectedGoal?.recommended_macro_split) {
      setProteinPercentage(selectedGoal.recommended_macro_split.protein_percentage);
      setCarbsPercentage(selectedGoal.recommended_macro_split.carbs_percentage);
      setFatPercentage(selectedGoal.recommended_macro_split.fat_percentage);
    }
  };

  // Save nutrition goals to Firestore
  const handleSaveGoals = async () => {
    if (!user || !nutritionGoals) return;

    // Validate all sections
    const goalErrors = validateNutritionGoals(nutritionGoals);
    const physicalErrors = validatePhysicalMetrics();
    const macroErrors = validateMacroTargets();
    
    const allErrors = [
      ...goalErrors.map(error => error.message),
      ...physicalErrors,
      ...macroErrors
    ];

    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      return;
    }

    setLoading(true);
    setValidationErrors([]);

    try {
      const { db, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(db, 'users', user.uid);

      // Create macro targets object
      const macroTargets: MacroTargets = {
        protein_percentage: proteinPercentage,
        carbs_percentage: carbsPercentage,
        fat_percentage: fatPercentage
      };

      // Create complete nutrition goals object
      const completeGoals: NutritionGoals = {
        ...nutritionGoals,
        current_weight: currentWeight || undefined,
        target_weight: targetWeight || undefined,
        height: height || undefined,
        macro_targets: macroTargets
      };

      await firestore.updateDoc(userDocRef, {
        nutrition_goals: completeGoals,
        updated_at: new Date()
      });
      
      setNutritionGoals(completeGoals);
      onSuccess('Nutrition goals saved successfully!');
      setIsEditing(false);
    } catch (error: any) {
      onError(error.message || 'Failed to save nutrition goals');
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing and reset to original state
  const handleCancelEdit = () => {
    setIsEditing(false);
    setValidationErrors([]);
    // Reload original data
    const loadOriginalGoals = async () => {
      if (user) {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const goals = data.nutrition_goals;
          setNutritionGoals(goals || null);
          
          // Reset form data
          setCurrentWeight(goals?.current_weight || '');
          setTargetWeight(goals?.target_weight || '');
          setHeight(goals?.height || '');
          
          if (goals?.macro_targets) {
            setProteinPercentage(goals.macro_targets.protein_percentage);
            setCarbsPercentage(goals.macro_targets.carbs_percentage);
            setFatPercentage(goals.macro_targets.fat_percentage);
          }
        }
      }
    };
    loadOriginalGoals();
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
          <h2>Nutrition Goals</h2>
          <Tooltip content="Set your daily macro and caloric targets based on your fitness goals, activity level, and body metrics." />
        </div>
        {!isEditing && (
          <button 
            className="edit-section-button" 
            onClick={handleStartEdit}
            title="Edit nutrition goals"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        )}
      </div>

      <div className="profile-card">
        {validationErrors.length > 0 && (
          <div className="validation-errors">
            <h4>Please fix the following errors:</h4>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Nutrition Goals Modal */}
        <NutritionGoalsModal
          isOpen={isEditing}
          onClose={handleCancelEdit}
          onSave={handleSaveGoals}
          loading={loading}
          validationErrors={validationErrors}
          nutritionGoals={nutritionGoals}
          currentWeight={currentWeight}
          targetWeight={targetWeight}
          height={height}
          proteinPercentage={proteinPercentage}
          carbsPercentage={carbsPercentage}
          fatPercentage={fatPercentage}
          totalPercentage={totalPercentage}
          onGoalSelection={handleGoalSelection}
          onActivityLevelChange={handleActivityLevelChange}
          onCurrentWeightChange={setCurrentWeight}
          onTargetWeightChange={setTargetWeight}
          onHeightChange={setHeight}
          onProteinChange={handleProteinChange}
          onCarbsChange={handleCarbsChange}
          onFatChange={handleFatChange}
          onResetToRecommended={handleResetToRecommended}
        />

        {!isEditing && (
          <div className="nutrition-goals-display">
            {nutritionGoals ? (
              <div className="goals-summary">
                <div className="goal-summary-item">
                  <strong>Primary Goal:</strong>
                  <span>
                    {GOAL_OPTIONS.find(goal => goal.id === nutritionGoals.primary_goal)?.icon}{' '}
                    {GOAL_OPTIONS.find(goal => goal.id === nutritionGoals.primary_goal)?.title}
                  </span>
                </div>
                <div className="goal-summary-item">
                  <strong>Activity Level:</strong>
                  <span>
                    {ACTIVITY_LEVELS.find(level => level.id === nutritionGoals.activity_level)?.label}
                  </span>
                </div>
                {nutritionGoals.current_weight && (
                  <div className="goal-summary-item">
                    <strong>Current Weight:</strong>
                    <span>{nutritionGoals.current_weight} lbs</span>
                  </div>
                )}
                {nutritionGoals.target_weight && (
                  <div className="goal-summary-item">
                    <strong>Target Weight:</strong>
                    <span>{nutritionGoals.target_weight} lbs</span>
                  </div>
                )}
                {nutritionGoals.macro_targets && (
                  <div className="goal-summary-item">
                    <strong>Macro Split:</strong>
                    <span>
                      {nutritionGoals.macro_targets.protein_percentage}% Protein, {' '}
                      {nutritionGoals.macro_targets.carbs_percentage}% Carbs, {' '}
                      {nutritionGoals.macro_targets.fat_percentage}% Fat
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-goals-set">
                <p>No nutrition goals set yet. Click "Edit" to get started!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NutritionGoalsSection;
