import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import type { User } from 'firebase/auth';

const GlobalSidebar: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Listen for profile picture changes
  useEffect(() => {
    if (!user?.uid) {
      setProfilePicture(null);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setProfilePicture(data.profile_picture || null);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <aside className="global-sidebar">
      <div className="sidebar-content">
        <div className="sidebar-brand">
          <Link to="/dashboard" className="brand-link">
            <img 
              src="/ou-logo.png" 
              alt="OU Sooners Logo" 
              className="brand-icon"
            />
            <h1>Nutrition Tracker</h1>
          </Link>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <span className="nav-icon"></span>
            <span className="nav-text">Dashboard</span>
          </Link>
        </nav>
        
        <div className="sidebar-footer">
          {user ? (
            <Link to="/profile" className="user-profile-button">
              <div className="user-profile-content">
                <div className="user-profile-picture">
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt="Profile" 
                      className="profile-image-small"
                      onError={() => setProfilePicture(null)}
                    />
                  ) : (
                    <div className="profile-picture-placeholder">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="user-profile-info">
                  <div className="user-profile-name">Profile</div>
                </div>
              </div>
            </Link>
          ) : (
            <Link to="/auth" className="auth-cta-button">
              <div className="auth-cta-content">
                <div className="auth-cta-text">
                  <div className="auth-cta-title">Log in or Sign up</div>
                  <div className="auth-cta-subtitle">to save your preferences</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
};

export default GlobalSidebar;
