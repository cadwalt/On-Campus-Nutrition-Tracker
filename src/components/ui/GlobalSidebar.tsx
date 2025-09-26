import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../../firebase';
import type { User } from 'firebase/auth';

const GlobalSidebar: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <aside className="global-sidebar">
      <div className="sidebar-content">
        <div className="sidebar-brand">
          <Link to="/dashboard" className="brand-link">
            <div className="brand-icon">🍎</div>
            <h1>Nutrition Tracker</h1>
          </Link>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            <span className="nav-text">Dashboard</span>
          </Link>
        </nav>
        
        <div className="sidebar-footer">
          {user ? (
            <Link to="/profile" className="user-profile-button">
              <div className="user-profile-content">
                <div className="user-profile-picture">
                  <div className="profile-picture-placeholder">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
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
