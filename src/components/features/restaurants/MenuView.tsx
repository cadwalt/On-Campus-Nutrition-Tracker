import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../../lib/resolveFirebase';
import type { MenuItem } from '../../../utils/sampleRestaurantData';
import MenuItemCard from './MenuItemCard';
import { SearchIcon } from '../../ui/Icons';

interface Restaurant {
  id: string;
  name: string;
  location: string;
}

interface MenuViewProps {
  restaurant: Restaurant;
  onBack: () => void;
  onAddToMeals: (item: MenuItem) => void;
}

const MenuView: React.FC<MenuViewProps> = ({ restaurant, onBack, onAddToMeals }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('');
  const [userAllergens, setUserAllergens] = useState<string[]>([]);
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

  // Load user allergens
  useEffect(() => {
    if (!user) {
      setUserAllergens([]);
      return;
    }

    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserAllergens(data.allergens || []);
        }
      } catch (err) {
        console.error('Error loading user allergens:', err);
      }
    })();
  }, [user]);

  // Load menu items
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const restaurantRef = firestore.doc(db, 'restaurants_sample', restaurant.id);
        const menuRef = firestore.collection(restaurantRef, 'menu');
        
        unsub = firestore.onSnapshot(menuRef, (snap: any) => {
          const items: MenuItem[] = [];
          snap.forEach((doc: any) => {
            const data = doc.data();
            items.push({
              id: doc.id,
              name: data.name || '',
              description: data.description,
              mealType: data.mealType || 'Lunch',
              nutritionInfo: data.nutritionInfo || { calories: 0 },
              allergens: data.allergens || [],
              servingSize: data.servingSize || '1 serving',
              price: data.price,
              available: data.available !== false,
              category: data.category,
            } as MenuItem);
          });
          setMenuItems(items);
          setLoading(false);
        });
      } catch (err) {
        console.error('Error loading menu:', err);
        setLoading(false);
      }
    })();
    
    return () => { if (unsub) unsub(); };
  }, [restaurant.id]);

  // Filter menu items
  const filteredItems = React.useMemo(() => {
    let filtered = [...menuItems];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query)
      );
    }

    // Meal type filter
    if (mealTypeFilter) {
      filtered = filtered.filter((item) => item.mealType === mealTypeFilter);
    }

    return filtered;
  }, [menuItems, searchQuery, mealTypeFilter]);

  // Get unique meal types for filter
  const mealTypes = React.useMemo(() => {
    const types = new Set(menuItems.map((item) => item.mealType));
    return Array.from(types).sort();
  }, [menuItems]);

  // Get unique categories for grouping
  const categories = React.useMemo(() => {
    const cats = new Set(menuItems.map((item) => item.category || 'Other').filter(Boolean));
    return Array.from(cats).sort();
  }, [menuItems]);

  // Group items by category
  const groupedItems = React.useMemo(() => {
    if (categories.length === 0) return { 'All Items': filteredItems };
    
    const grouped: Record<string, MenuItem[]> = {};
    filteredItems.forEach((item) => {
      const category = item.category || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });
    return grouped;
  }, [filteredItems, categories]);

  if (loading) {
    return <div className="muted">Loading menu...</div>;
  }

  if (menuItems.length === 0) {
    return (
      <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No menu items available.</p>
        <button
          onClick={onBack}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: 'rgba(99, 102, 241, 0.3)',
            border: '1px solid rgba(99, 102, 241, 0.5)',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          ← Back to Restaurants
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ← Back
        </button>
        <div>
          <h2 style={{ margin: 0 }}>{restaurant.name}</h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted, #9aa7bf)' }}>
            {restaurant.location} • {menuItems.length} items
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '0.75rem',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 1rem',
              paddingLeft: '2.25rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
          <SearchIcon
            size={16}
            style={{
              position: 'absolute',
              left: '0.625rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted, #9aa7bf)',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* Meal Type Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMealTypeFilter('')}
            style={{
              padding: '0.4rem 0.75rem',
              background: !mealTypeFilter ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${!mealTypeFilter ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.8125rem',
              cursor: 'pointer'
            }}
          >
            All
          </button>
          {mealTypes.map((type) => (
            <button
              key={type}
              onClick={() => setMealTypeFilter(type)}
              style={{
                padding: '0.4rem 0.75rem',
                background: mealTypeFilter === type ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${mealTypeFilter === type ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.8125rem',
                cursor: 'pointer'
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
          No menu items match your search.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              {categories.length > 1 && (
                <h3 style={{
                  marginBottom: '1rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--muted, #9aa7bf)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {category}
                </h3>
              )}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                {items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToMeals={onAddToMeals}
                    userAllergens={userAllergens}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuView;

