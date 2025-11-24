import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
// Resolve auth at runtime to avoid bundling firebase in initial chunk
const resolveAuthClient = async () => {
  const mod: any = await import('../firebase');
  const auth = (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;
  const firebaseAuth = await import('firebase/auth');
  return { auth, firebaseAuth };
};
import Toast from '../components/ui/Toast';
import PersonalInformation from '../components/profile/PersonalInformation';
import AllergensSection from '../components/profile/AllergensSection';
import NutritionGoalsSection from '../components/profile/NutritionGoalsSection';
import DietaryRestrictionsSection from '../components/profile/DietaryRestrictionsSection';
import MealPreferencesSection from '../components/profile/MealPreferencesSection';
import AccountSection from '../components/profile/AccountSection';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const showToastNotification = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const hideToast = () => {
    setShowToast(false);
    setToastMessage(null);
  };

  const handleLogout = () => {
    navigate('/dashboard');
  };

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
      <div className="profile-page">
        <div className="page-header">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="page-header">
          <h1>Not Signed In</h1>
          <p>Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <main className="profile-content">
        <PersonalInformation 
          user={user} 
          onSuccess={(message) => showToastNotification(message, 'success')}
          onError={(message) => showToastNotification(message, 'error')}
        />

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
          onSuccess={(message) => showToastNotification(message, 'success')}
          onError={(message) => showToastNotification(message, 'error')}
        />

        <MealPreferencesSection 
          user={user} 
          onSuccess={(message) => showToastNotification(message, 'success')}
          onError={(message) => showToastNotification(message, 'error')}
        />

        <AccountSection 
          onLogout={handleLogout}
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

export default ProfilePage;

