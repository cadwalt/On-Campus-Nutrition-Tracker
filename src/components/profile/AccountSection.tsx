import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';

interface AccountSectionProps {
  onLogout: () => void;
}

const AccountSection: React.FC<AccountSectionProps> = ({ onLogout }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <h2>Account</h2>
      </div>
      <div className="profile-card">
        <div className="profile-actions">
          <button className="logout-button" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSection;
