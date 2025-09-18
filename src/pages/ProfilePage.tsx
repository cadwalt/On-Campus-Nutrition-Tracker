import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import type { User } from 'firebase/auth';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
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

  const handleEditClick = () => {
    setIsEditing(true);
    setNewDisplayName(user?.displayName || '');
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewDisplayName('');
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newDisplayName.trim()) return;

    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      await updateProfile(user, {
        displayName: newDisplayName.trim()
      });
      
      console.log("Display name updated successfully!");
      // Now, check the user object directly
      console.log("Current user's display name:", user.displayName); // <-- This will show the updated name!
      
      // Force a reload to ensure the user object is fully updated
      await user.reload();
      console.log("Reloaded user display name:", user.displayName);
      
      setUpdateSuccess(true);
      setIsEditing(false);
      setNewDisplayName('');
      
      // Update the local user state to reflect the change
      setUser({ ...user, displayName: newDisplayName.trim() });
    } catch (error: any) {
      console.error("Error updating display name:", error);
      setUpdateError(error.message || 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
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
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="edit-form">
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="name-input"
                    disabled={updateLoading}
                    required
                  />
                  <div className="edit-buttons">
                    <button 
                      type="submit" 
                      className="save-button"
                      disabled={updateLoading || !newDisplayName.trim()}
                    >
                      {updateLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      type="button" 
                      className="cancel-button"
                      onClick={handleCancelEdit}
                      disabled={updateLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2>{user.displayName || 'User'}</h2>
                  <p className="user-email">{user.email}</p>
                  <button className="edit-name-button" onClick={handleEditClick}>
                    Edit Name
                  </button>
                </>
              )}
            </div>
          </div>

          {updateSuccess && (
            <div className="success-message">
              Profile updated successfully!
            </div>
          )}

          {updateError && (
            <div className="error-message">
              {updateError}
            </div>
          )}

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

