<<<<<<< HEAD
import React from 'react';

interface AccountSectionProps {
  onLogout: () => void;
}

const AccountSection: React.FC<AccountSectionProps> = ({ onLogout }) => {
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
          <button className="logout-button" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSection;
=======
import React from 'react';

interface AccountSectionProps {
  onLogout: () => void;
}

const AccountSection: React.FC<AccountSectionProps> = ({ onLogout }) => {
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
          <button className="logout-button" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSection;
>>>>>>> 3449604f23503c51d893151942e46f034bb45a8d
