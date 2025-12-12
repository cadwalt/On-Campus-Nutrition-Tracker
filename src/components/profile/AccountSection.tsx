import React, { useState } from 'react';
import ChangePasswordModal from './modals/ChangePasswordModal';

interface AccountSectionProps {
  onLogout: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

const AccountSection: React.FC<AccountSectionProps> = ({ onLogout, onSuccess, onError }) => {
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const mod: any = await import('../../firebase');
      const authClient = (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;
      const firebaseAuth = await import('firebase/auth');
      await firebaseAuth.signOut(authClient);
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
          <button 
            className="change-password-button" 
            onClick={() => setIsChangePasswordModalOpen(true)}
            style={{ backgroundColor: 'black', color: 'white' }}
          >
            Change Password
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSuccess={(message) => {
          onSuccess?.(message);
          setIsChangePasswordModalOpen(false);
        }}
        onError={(message) => {
          onError?.(message);
        }}
      />
    </div>
  );
};

export default AccountSection;
