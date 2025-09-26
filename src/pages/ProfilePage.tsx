import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import type { User } from 'firebase/auth';
import Toast from '../components/ui/Toast';
import PersonalInformation from '../components/profile/PersonalInformation';
import AllergensSection from '../components/profile/AllergensSection';
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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
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

