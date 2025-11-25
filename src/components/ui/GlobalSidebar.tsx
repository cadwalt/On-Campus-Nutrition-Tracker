import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../lib/resolveFirebase';

const GlobalSidebar: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveFirebase();
        unsub = firebaseAuth.onAuthStateChanged(auth, (user: User | null) => setUser(user));
      } catch (err) {
        console.error('Failed to init auth listener', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Listen for profile picture changes
  useEffect(() => {
    if (!user?.uid) {
      setProfilePicture(null);
      return;
    }

    let unsubLocal: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        unsubLocal = firestore.onSnapshot(userDocRef, (docSnap: any) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfilePicture(data.profile_picture || null);
          }
        });
      } catch (err) {
        console.error('Profile picture listener failed', err);
      }
    })();
    return () => { if (unsubLocal) unsubLocal(); };
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
          <Link to="/ai-assistant" className={`nav-link ${location.pathname === '/ai-assistant' ? 'active' : ''}`}>
            <span className="nav-icon"></span>
            <span className="nav-text">AI Assistant</span>
          </Link>
          <Link to="/meals" className={`nav-link ${location.pathname === '/meals' ? 'active' : ''}`}>
            <span className="nav-icon"></span>
            <span className="nav-text">Meals</span>
          </Link>
          <Link to="/preferences" className={`nav-link ${location.pathname === '/preferences' ? 'active' : ''}`}>
            <span className="nav-icon"></span>
            <span className="nav-text">Preferences</span>
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
