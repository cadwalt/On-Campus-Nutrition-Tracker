import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
        <p>Manage your account settings</p>
      </div>

      <main className="profile-content">
        <div className="profile-card">
          <div className="profile-info-section">
            <div className="profile-picture-large">
              <div className="profile-picture-placeholder-large">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            
            <div className="user-details">
              <h2>{user.displayName || 'User'}</h2>
              <p className="user-email">{user.email}</p>
            </div>
          </div>

          <div className="profile-actions">
            <button className="logout-button" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
