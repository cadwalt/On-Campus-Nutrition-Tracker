import React from 'react';
import WeightTracker from '../components/features/WeightTracker';

const WeightTrackerPage: React.FC = () => {
  return (
    <div className="page weight-tracker-page">
      <h2>Weight Tracker</h2>
      <WeightTracker />
    </div>
  );
};

export default WeightTrackerPage;
