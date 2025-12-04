import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { User } from 'firebase/auth';
// Resolve auth at runtime to avoid bundling firebase in initial chunk
const resolveAuthClient = async () => {
  const mod: any = await import('../firebase');
  const auth = (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;
  const firebaseAuth = await import('firebase/auth');
  return { auth, firebaseAuth };
};
import Toast from '../components/ui/Toast';
import AllergensSection from '../components/profile/AllergensSection';
import NutritionGoalsSection from '../components/profile/NutritionGoalsSection';
import DietaryRestrictionsSection from '../components/profile/DietaryRestrictionsSection';
import MealPreferencesSection from '../components/profile/MealPreferencesSection';

const PreferencesPage: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const [openNutritionGoals, setOpenNutritionGoals] = useState(false);

  const showToastNotification = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const hideToast = () => {
    setShowToast(false);
    setToastMessage(null);
  };

  useEffect(() => {
    // Check if we need to open nutrition goals modal from location state
    if ((location.state as any)?.openNutritionGoals) {
      setOpenNutritionGoals(true);
    }
  }, [location]);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveAuthClient();
        unsub = firebaseAuth.onAuthStateChanged(auth, (user: User | null) => {
          setUser(user);
          setLoading(false);
        });
      } catch (err) {
        console.error('Failed to init auth listener', err);
        setLoading(false);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  if (loading) {
    return (
      <div className="preferences-page">
        <main className="preferences-content">
          <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="preferences-page">
        <main className="preferences-content">
          <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Please sign in to access personalized preferences.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="preferences-page">
      <main className="preferences-content">
        <AllergensSection 
          user={user} 
          onSuccess={(message) => showToastNotification(message, 'success')}
          onError={(message) => showToastNotification(message, 'error')}
        />

        <DietaryRestrictionsSection 
          user={user} 
          onSuccess={(message) => showToastNotification(message, 'success')}
          onError={(message) => showToastNotification(message, 'error')}
        />

        <NutritionGoalsSection 
          user={user}
          initialOpen={openNutritionGoals}
          onSuccess={(message) => showToastNotification(message, 'success')}
          onError={(message) => showToastNotification(message, 'error')}
        />

        <MealPreferencesSection 
          user={user} 
          onSuccess={(message) => showToastNotification(message, 'success')}
          onError={(message) => showToastNotification(message, 'error')}
        />
      </main>
      
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          isVisible={showToast}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default PreferencesPage;

