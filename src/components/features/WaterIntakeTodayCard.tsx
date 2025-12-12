import React, { useState } from 'react';
import { mlToOz, ozToMl } from '../../types/water';

// Load Firebase lazily
const resolveFirebase = async () => {
  // This helper gives us scoped access to auth + Firestore from a single place.
  // It keeps Firebase as a separate "privileged compartment" and this UI
  // component only performs a narrow, user-specific update (their own goal).
  const mod: any = await import('../../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firestore };
};

interface WaterIntakeTodayCardProps {
  totalMlToday: number;
  progressPercentage: number;
  remainingMl: number;
  remainingOz: number;
  goalOz: number;
  goalMl: number;
  unit: 'oz' | 'ml';
  user: any | null;
  loading: boolean;
  onGoalUpdate: (goalMl: number) => void;
}

const WaterIntakeTodayCard: React.FC<WaterIntakeTodayCardProps> = ({
  totalMlToday,
  progressPercentage,
  remainingMl,
  remainingOz,
  goalOz,
  goalMl,
  unit,
  user,
  loading,
  onGoalUpdate,
}) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState<string>('');
  const [goalInputUnit, setGoalInputUnit] = useState<'oz' | 'ml'>('oz');
  const [localLoading, setLocalLoading] = useState(false);

  const totalOzToday = mlToOz(totalMlToday);
  const totalMlDisplay = totalMlToday;
  
  const isLoading = loading || localLoading;

  const handleStartEditGoal = () => {
    setIsEditingGoal(true);
    setGoalInput(unit === 'oz' ? goalOz.toString() : goalMl.toString());
    setGoalInputUnit(unit);
  };

  const handleSaveGoal = async () => {
    if (!user?.uid) return;

    const val = parseFloat(goalInput);
    if (!val || val <= 0) return;

    setLocalLoading(true);
    try {
      const newGoalMl = goalInputUnit === 'oz' ? ozToMl(val) : Math.round(val);
      const { dbClient, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(dbClient, 'users', user.uid);
      await firestore.updateDoc(userDocRef, {
        water_goal_ml: newGoalMl,
        updated_at: new Date()
      });
      onGoalUpdate(newGoalMl);
      setIsEditingGoal(false);
      setGoalInput('');
    } catch (e) {
      console.error('Failed to save water goal', e);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleCancelEditGoal = () => {
    setIsEditingGoal(false);
    setGoalInput('');
  };

  return (
    <div className="card">
      <div className="section-header-with-tooltip">
        <h2>Today's Water Intake</h2>
      </div>

      <div className="water-tracker">
        {isEditingGoal ? (
          <div className="water-goal-edit-container">
            <div className="water-goal-edit-header">
              <h3>Edit Daily Goal</h3>
            </div>

            <div className="water-goal-edit">
              <div className="water-goal-edit-input-wrap">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="water-goal-input"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveGoal();
                    }
                    if (e.key === 'Escape') {
                      handleCancelEditGoal();
                    }
                  }}
                  aria-label="Daily water goal amount"
                  aria-required="true"
                  disabled={isLoading || !user}
                  autoFocus
                />

                <select
                  className="water-goal-unit"
                  value={goalInputUnit}
                  onChange={(e) => setGoalInputUnit(e.target.value as 'oz' | 'ml')}
                  aria-label="Daily water goal unit"
                  disabled={isLoading}
                >
                  <option value="oz">oz</option>
                  <option value="ml">ml</option>
                </select>
              </div>

              <div className="water-goal-edit-actions">
                <button
                  className="water-goal-save-btn"
                  onClick={handleSaveGoal}
                  disabled={isLoading || !goalInput || !user}
                  aria-label="Save daily water goal"
                >
                  Save
                </button>

                <button
                  className="water-goal-cancel-btn"
                  onClick={handleCancelEditGoal}
                  disabled={isLoading}
                  aria-label="Cancel editing daily water goal"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="water-summary">
            <div className="water-amount">
              {unit === 'oz' ? `${totalOzToday} oz` : `${totalMlDisplay} ml`}
            </div>

            <div className="water-label">
              <div className="water-goal-display">
                of {unit === 'oz' ? `${goalOz} oz` : `${goalMl} ml`} goal
                {user && (
                  <button
                    className="water-goal-edit-icon"
                    onClick={handleStartEditGoal}
                    disabled={isLoading}
                    title="Edit daily goal"
                    aria-label="Edit daily water goal"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {!isEditingGoal && (
          <div className="water-progress-container">
            <div
              className="water-progress-bar"
              role="progressbar"
              aria-label="Daily water goal progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(Math.max(Math.round(progressPercentage), 0), 100)}
              aria-valuetext={`You have consumed ${
                unit === 'oz' ? `${totalOzToday} oz` : `${totalMlDisplay} ml`
              } out of ${
                unit === 'oz' ? `${goalOz} oz` : `${goalMl} ml`
              } (${Math.round(progressPercentage)}% of goal).`}
            >
              <div
                className="water-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div
              className="water-progress-info"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="water-progress-percentage">
                {Math.round(progressPercentage)}%
              </span>

              {remainingMl > 0 && (
                <span className="water-progress-remaining">
                  {unit === 'oz' ? `${remainingOz} oz` : `${remainingMl} ml`} remaining
                </span>
              )}

              {remainingMl <= 0 && (
                <span className="water-progress-complete">
                  Goal achieved! 🎉
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterIntakeTodayCard;
