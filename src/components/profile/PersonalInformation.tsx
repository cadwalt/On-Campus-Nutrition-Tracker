import React, { useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { User } from 'firebase/auth';

interface PersonalInformationProps {
  user: User;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const PersonalInformation: React.FC<PersonalInformationProps> = ({ user, onSuccess, onError }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
    setNewDisplayName(user.displayName || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewDisplayName('');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newDisplayName.trim()) return;

    setUpdateLoading(true);

    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: newDisplayName.trim()
      });
      
      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: newDisplayName.trim(),
        updated_at: new Date()
      });
      
      // Force a reload to ensure the user object is fully updated
      await user.reload();
      
      onSuccess('Profile updated successfully!');
      setIsEditing(false);
      setNewDisplayName('');
    } catch (error: any) {
      onError(error.message || 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="profile-section">
      <div className="section-header">
        <h2>Personal Information</h2>
      </div>
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
                <div className="name-with-edit">
                  <h3>{user.displayName || 'User'}</h3>
                  <button className="edit-name-icon" onClick={handleEditClick} title="Edit name">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
                <p className="user-email">{user.email}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInformation;
