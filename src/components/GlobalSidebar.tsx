import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const GlobalSidebar: React.FC = () => {
  const location = useLocation();

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
          <Link to="/auth" className="auth-cta-button">
            <div className="auth-cta-content">
              <div className="auth-cta-text">
                <div className="auth-cta-title">Log in or Sign up</div>
                <div className="auth-cta-subtitle">to save your preferences</div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default GlobalSidebar;
