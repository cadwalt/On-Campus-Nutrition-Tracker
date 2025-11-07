import React from 'react';
import MealForm from '../components/features/MealForm';
import YourMealsList from '../components/features/YourMealsList';

const MealTrackerPage: React.FC = () => {
  return (
    <div className="page meal-tracker-page">
      <div className="page-header">
        <h1>Meal Tracker</h1>
        <p>Input detailed nutrition for your meals and build a personal history.</p>
      </div>

      <main className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-left">
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2>Add a Meal</h2>
              <p style={{ color: 'var(--muted, #9aa7bf)', marginTop: 6 }}>
                Provide nutrition facts for a meal you ate. Required fields are marked with an asterisk (*).
              </p>
              <div style={{ marginTop: 16 }}>
                <MealForm onMealAdded={() => { /* no-op; list auto updates via snapshot */ }} />
              </div>
            </div>
            <div className="card">
              <h2>Your Meals</h2>
              <p style={{ color: 'var(--muted, #9aa7bf)', marginTop: 6 }}>
                Previously saved meals with basic macro details.
              </p>
              <div style={{ marginTop: 12 }}>
                <YourMealsList />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MealTrackerPage;
