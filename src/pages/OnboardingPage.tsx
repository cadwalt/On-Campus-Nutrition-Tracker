import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Lazily resolve Firebase to avoid bundling the SDK in the main chunk
const resolveFirebase = async () => {
  const mod: any = await import('../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firestore };
};
import type { 
  NutritionGoals, 
  PrimaryGoal, 
  ActivityLevel,
  DietaryRestriction,
  CookingSkill
} from '../types/nutrition';
import { 
  GOAL_OPTIONS, 
  ACTIVITY_LEVELS,
  DIETARY_RESTRICTIONS,
  COOKING_SKILLS
} from '../constants/nutrition';

const ALLERGENS = [
  "Milk", "Eggs", "Fish", "Crustacean shellfish", "Tree nuts",
  "Peanuts", "Wheat", "Soybeans", "Sesame"
];

const OnboardingPage: React.FC = () => {
  // Allergens state
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  
  // Nutrition Goals state
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | ''>('');
  const [targetWeight, setTargetWeight] = useState<number | ''>('');
  const [height, setHeight] = useState<number | ''>('');
  
  // Dietary Restrictions state
  const [selectedRestrictions, setSelectedRestrictions] = useState<DietaryRestriction[]>([]);
  
  // Meal Preferences state
  const [cookingSkill, setCookingSkill] = useState<CookingSkill | null>(null);
  const [mealFrequency, setMealFrequency] = useState<number>(3);
  
  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Handler functions
  const handleAllergenChange = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleRestrictionChange = (restriction: DietaryRestriction) => {
    setSelectedRestrictions(prev =>
      prev.includes(restriction)
        ? prev.filter(r => r !== restriction)
        : [...prev, restriction]
    );
  };

  const handleGoalSelection = (goalId: PrimaryGoal) => {
    setPrimaryGoal(goalId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { authClient, dbClient, firestore } = await resolveFirebase();
    const user = authClient.currentUser;
    if (!user) {
      setError("No user found.");
      setLoading(false);
      return;
    }

    // Validation
    if (!primaryGoal || !activityLevel || !cookingSkill) {
      setError("Please complete all required fields.");
      setLoading(false);
      return;
    }

    try {
      const userDocRef = firestore.doc(dbClient, 'users', user.uid);

      // Create nutrition goals
      const nutritionGoals: NutritionGoals = {
        primary_goal: primaryGoal,
        activity_level: activityLevel,
        current_weight: currentWeight || undefined,
        target_weight: targetWeight || undefined,
        height: height || undefined,
        preferences: {
          dietary_restrictions: selectedRestrictions,
          meal_frequency: mealFrequency,
          cooking_skill: cookingSkill
        }
      };

      await firestore.updateDoc(userDocRef, {
        allergens: selectedAllergens,
        nutrition_goals: nutritionGoals,
        updated_at: new Date()
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError("Failed to save information.");
    }
    setLoading(false);
  };

  return (
    <div className="onboarding-form">
      <h2>Tell us about yourself</h2>
      <form onSubmit={handleSubmit}>
        
        {/* Primary Goal Selection */}
        <div className="onboarding-section">
          <h3>What's your primary goal? *</h3>
          <div className="goal-options-grid">
            {GOAL_OPTIONS.map(goal => (
              <div
                key={goal.id}
                className={`goal-option-card ${primaryGoal === goal.id ? 'selected' : ''}`}
                onClick={() => handleGoalSelection(goal.id)}
                style={{ 
                  background: primaryGoal === goal.id 
                    ? `${goal.color}15` 
                    : undefined,
                  borderColor: primaryGoal === goal.id 
                    ? goal.color 
                    : undefined,
                  boxShadow: primaryGoal === goal.id 
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
        <div className="onboarding-section">
          <h3>Activity Level *</h3>
          <div className="activity-level-options">
            {ACTIVITY_LEVELS.map(level => (
              <label 
                key={level.id} 
                className={`activity-level-option ${activityLevel === level.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="activity_level"
                  value={level.id}
                  checked={activityLevel === level.id}
                  onChange={() => setActivityLevel(level.id)}
                />
                <div className="activity-level-content">
                  <strong>{level.label}</strong>
                  <p>{level.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Physical Metrics */}
        <div className="onboarding-section">
          <h3>Physical Metrics (Optional)</h3>
          <p>Enter your body measurements to personalize your nutrition plan.</p>
          <div className="physical-metrics-grid">
            <div className="metric-card">
              <div className="metric-card-header">
                <h4 className="metric-card-title">Current Weight</h4>
                <div className="metric-input-group">
                  <input
                    type="number"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value ? Number(e.target.value) : '')}
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
                    type="number"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value ? Number(e.target.value) : '')}
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
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : '')}
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

        {/* Dietary Restrictions */}
        <div className="onboarding-section">
          <h3>Dietary Restrictions</h3>
          <p>Select any dietary restrictions to help us provide better meal recommendations.</p>
          <div className="dietary-restrictions-grid">
            {DIETARY_RESTRICTIONS.map(restriction => (
              <label 
                key={restriction.id} 
                className={`dietary-restriction-item ${selectedRestrictions.includes(restriction.id as DietaryRestriction) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedRestrictions.includes(restriction.id as DietaryRestriction)}
                  onChange={() => handleRestrictionChange(restriction.id as DietaryRestriction)}
                />
                <div className="dietary-restriction-content">
                  <strong>{restriction.label}</strong>
                  <p>{restriction.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Cooking Skill */}
        <div className="onboarding-section">
          <h3>Cooking Skill Level *</h3>
          <div className="cooking-skill-options">
            {COOKING_SKILLS.map(skill => (
              <label 
                key={skill.id} 
                className={`cooking-skill-option ${cookingSkill === skill.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="cooking_skill"
                  value={skill.id}
                  checked={cookingSkill === skill.id}
                  onChange={() => setCookingSkill(skill.id as CookingSkill)}
                />
                <div className="cooking-skill-content">
                  <div className="skill-icon">
                    {skill.id === 'beginner' && '👶'}
                    {skill.id === 'intermediate' && '👨‍🍳'}
                    {skill.id === 'advanced' && '👨‍💼'}
                  </div>
                  <div className="skill-details">
                    <strong>{skill.label}</strong>
                    <p>{skill.description}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Meal Frequency */}
        <div className="onboarding-section">
          <h3>Meal Frequency</h3>
          <p>How many meals do you typically eat per day?</p>
          <div className="frequency-selector">
            <label>
              Meals per day: <span style={{ color: '#8b5cf6' }}>{mealFrequency}</span>
            </label>
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <input
                type="range"
                min="1"
                max="8"
                value={mealFrequency}
                onChange={(e) => setMealFrequency(Number(e.target.value))}
                className="frequency-slider"
              />
              <div className="slider-track">
                <div 
                  className="slider-progress"
                  style={{
                    width: `${((mealFrequency - 1) / 7) * 100}%`
                  }}
                ></div>
              </div>
            </div>
            <div className="frequency-range">
              1 - 8 meals per day
            </div>
          </div>
        </div>

        {/* Allergens */}
        <div className="onboarding-section">
          <h3>Select your allergens:</h3>
          <div className="allergen-grid">
            {ALLERGENS.map(allergen => (
              <label key={allergen} className="allergen-item">
                <input
                  type="checkbox"
                  checked={selectedAllergens.includes(allergen)}
                  onChange={() => handleAllergenChange(allergen)}
                />
                {allergen}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Complete Setup"}
        </button>
      </form>
    </div>
  );
};

export default OnboardingPage;