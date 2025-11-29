import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../../lib/resolveFirebase';
import { MapPinIcon } from '../../ui/Icons';

export interface Restaurant {
  id: string;
  name: string;
  location: string;
  description?: string;
  hours?: any;
  mealTypes: string[];
  menuItemCount?: number;
}

interface RestaurantListProps {
  onSelectRestaurant: (restaurant: Restaurant) => void;
  locationFilter?: string;
  mealTypeFilter?: string;
  onLocationFilterChange?: (location: string) => void;
  onMealTypeFilterChange?: (mealType: string) => void;
}

const RestaurantList: React.FC<RestaurantListProps> = ({
  onSelectRestaurant,
  locationFilter,
  mealTypeFilter,
  onLocationFilterChange,
  onMealTypeFilterChange,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Track auth state
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveFirebase();
        unsub = firebaseAuth.onAuthStateChanged(auth, (u: User | null) => setUser(u));
      } catch (err) {
        console.error('Auth listener init failed', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Load restaurants from Firestore
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const restaurantsRef = firestore.collection(db, 'restaurants_sample');
        
        unsub = firestore.onSnapshot(restaurantsRef, async (snap: any) => {
          const restaurantList: Restaurant[] = [];
          
          for (const doc of snap.docs) {
            const data = doc.data();
            
            // Count menu items in subcollection
            const menuRef = firestore.collection(doc.ref, 'menu');
            const menuSnap = await firestore.getDocs(menuRef);
            const menuItemCount = menuSnap.size;
            
            restaurantList.push({
              id: doc.id,
              name: data.name || '',
              location: data.location || '',
              description: data.description,
              hours: data.hours,
              mealTypes: data.mealTypes || [],
              menuItemCount,
            });
          }
          
          setRestaurants(restaurantList);
          setLoading(false);
        });
      } catch (err) {
        console.error('Error loading restaurants:', err);
        setLoading(false);
      }
    })();
    
    return () => { if (unsub) unsub(); };
  }, []);

  // Filter restaurants
  const filteredRestaurants = React.useMemo(() => {
    let filtered = [...restaurants];

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter((r) => r.location === locationFilter);
    }

    // Meal type filter
    if (mealTypeFilter) {
      filtered = filtered.filter((r) => r.mealTypes.includes(mealTypeFilter));
    }

    return filtered;
  }, [restaurants, locationFilter, mealTypeFilter]);

  // Get unique locations for filter
  const locations = React.useMemo(() => {
    const locs = new Set(restaurants.map((r) => r.location));
    return Array.from(locs).sort();
  }, [restaurants]);

  // Get unique meal types for filter
  const mealTypes = React.useMemo(() => {
    const types = new Set<string>();
    restaurants.forEach((r) => r.mealTypes.forEach((t) => types.add(t)));
    return Array.from(types).sort();
  }, [restaurants]);

  // Check if restaurant is currently open
  const isOpen = (restaurant: Restaurant): boolean => {
    if (!restaurant.hours) return true;
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const todayHours = restaurant.hours[dayOfWeek];
    if (!todayHours) return false;
    
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const openTime = parseInt(todayHours.open.replace(':', ''));
    const closeTime = parseInt(todayHours.close.replace(':', ''));
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  if (!user) {
    return <div className="muted">Sign in to view restaurants.</div>;
  }

  if (loading) {
    return <div className="muted">Loading restaurants...</div>;
  }

  if (restaurants.length === 0) {
    return (
      <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No restaurants found.</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted, #9aa7bf)', marginTop: '0.5rem' }}>
          Make sure restaurant data has been populated.
        </p>
      </div>
    );
  }

  if (filteredRestaurants.length === 0) {
    return (
      <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No restaurants match your filters.</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted, #9aa7bf)', marginTop: '0.5rem' }}>
          Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        marginBottom: '1rem',
        padding: '0.75rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px'
      }}>
        <select
          value={locationFilter || ''}
          onChange={(e) => onLocationFilterChange?.(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="">All Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
        
        <select
          value={mealTypeFilter || ''}
          onChange={(e) => onMealTypeFilterChange?.(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="">All Meal Types</option>
          {mealTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Restaurant Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem'
      }}>
        {filteredRestaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            onClick={() => onSelectRestaurant(restaurant)}
            style={{
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{restaurant.name}</h3>
              <span style={{
                padding: '0.25rem 0.5rem',
                background: isOpen(restaurant) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${isOpen(restaurant) ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isOpen(restaurant) ? '#86efac' : '#fca5a5'
              }}>
                {isOpen(restaurant) ? 'Open' : 'Closed'}
              </span>
            </div>
            
            <div style={{ 
              fontSize: '0.875rem', 
              color: 'var(--muted, #9aa7bf)', 
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}>
              <MapPinIcon size={14} style={{ color: 'var(--muted, #9aa7bf)', flexShrink: 0 }} />
              <span>{restaurant.location}</span>
            </div>
            
            {restaurant.description && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted, #9aa7bf)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {restaurant.description}
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {restaurant.mealTypes.map((type) => (
                <span
                  key={type}
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#a5b4fc'
                  }}
                >
                  {type}
                </span>
              ))}
            </div>
            
            <div style={{ fontSize: '0.8125rem', color: 'var(--muted, #9aa7bf)' }}>
              {restaurant.menuItemCount || 0} menu items
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantList;

