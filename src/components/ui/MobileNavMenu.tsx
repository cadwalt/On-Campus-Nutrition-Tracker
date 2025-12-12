import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChartIcon, UtensilsIcon, TargetIcon, DropletIcon, NovaIcon, UserIcon } from './Icons';
import './MobileNavMenu.css';

const MobileNavMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const navItems = [
    { path: '/dashboard', icon: ChartIcon, label: 'Dashboard' },
    { path: '/meals', icon: UtensilsIcon, label: 'Meals' },
    { path: '/preferences', icon: TargetIcon, label: 'Preferences' },
    { path: '/water-intake', icon: DropletIcon, label: 'Water Intake' },
    { path: '/weight', icon: ChartIcon, label: 'Weight' },
    { path: '/ai-assistant', icon: NovaIcon, label: 'Ask Nova' },
    { path: '/profile', icon: UserIcon, label: 'Profile' },
  ];

  return (
    <>
      {/* Hamburger Button - Top Left */}
      <button 
        className={`mobile-hamburger-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="mobile-menu-backdrop" 
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Slide-up Menu */}
      <nav className={`mobile-slide-menu ${isOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <h2>Navigation</h2>
        </div>
        
        <div className="mobile-menu-items">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-menu-item ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                <Icon size={24} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default MobileNavMenu;
