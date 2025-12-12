import React from "react";
import WeightTracker from "./WeightTracker";

export const WeightTrackerCard: React.FC = () => {
  return (
    <>
      {/* Reusable card wrapper to drop the full weight tracker into dashboard layouts */}
      <section className="card weight-card" style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        {/* Encapsulated weight tracker UI (chart, table, inputs, goals) */}
        <WeightTracker />
      </section>
    </>
  );
};

export default WeightTrackerCard;
