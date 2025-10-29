// src/components/RestaurantDisplay.tsx
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface Restaurant {
  name: string;
  hours: string;
}

const RestaurantDisplay: React.FC = () => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        // Reference to the 'testRestaurant' document in the 'restaurants' collection
        const restaurantRef = doc(db, 'restaurants', 'testRestaurant');
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists()) {
          // Document data is available
          setRestaurant(restaurantSnap.data() as Restaurant);
        } else {
          setError('No such document!');
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError('Failed to fetch restaurant data.');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, []); // Run once on component mount

  if (loading) {
    return <p>Loading restaurant data...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div>
      <h2>Test Restaurant Info:</h2>
      {restaurant ? (
        <>
          <p><strong>Name:</strong> {restaurant.name}</p>
        </>
      ) : (
        <p>No restaurant data found.</p>
      )}
    </div>
  );
};

export default RestaurantDisplay;
