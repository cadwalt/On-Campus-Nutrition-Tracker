import React, { useState, useRef, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { IoCamera, IoTrash } from 'react-icons/io5';
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
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load existing profile picture on component mount
  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setProfilePicture(data.profile_picture || null);
        }
      } catch (error) {
        console.error('Error loading profile picture:', error);
      }
    };
    loadProfilePicture();
  }, [user.uid]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleEditClick = () => {
    setIsEditing(true);
    setNewDisplayName(user.displayName || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNewDisplayName('');
  };

  const handleProfilePictureClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleChangePicture = () => {
    fileInputRef.current?.click();
    setShowDropdown(false);
  };

  const handleRemovePicture = () => {
    handleRemoveProfilePicture();
    setShowDropdown(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file');
      return;
    }

    // Validate file size (max 2MB for base64)
    if (file.size > 2 * 1024 * 1024) {
      onError('Image size must be less than 2MB for optimal performance');
      return;
    }

    setIsUploading(true);

    try {
      // Convert image to base64
      const base64String = await convertToBase64(file);
      
      // Update Firebase Auth profile with a placeholder (photoURL has length limits)
      await updateProfile(user, {
        photoURL: `https://via.placeholder.com/150/667eea/ffffff?text=${user.displayName?.charAt(0) || 'U'}`
      });

      // Update Firestore document with base64 image
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        profile_picture: base64String,
        updated_at: new Date()
      });

      setProfilePicture(base64String);
      onSuccess('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Profile picture upload error:', error);
      onError(error.message || 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleRemoveProfilePicture = async () => {
    if (!profilePicture) return;

    setIsUploading(true);

    try {
      // Update Firebase Auth profile with a placeholder
      await updateProfile(user, {
        photoURL: `https://via.placeholder.com/150/667eea/ffffff?text=${user.displayName?.charAt(0) || 'U'}`
      });

      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        profile_picture: null,
        updated_at: new Date()
      });

      setProfilePicture(null);
      onSuccess('Profile picture removed successfully!');
    } catch (error: any) {
      console.error('Profile picture removal error:', error);
      onError(error.message || 'Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
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
                  <div className="profile-picture-wrapper" ref={dropdownRef}>
                    <div className="profile-picture-large">
                      {profilePicture ? (
                        <img 
                          src={profilePicture} 
                          alt="Profile" 
                          className="profile-image-large"
                          onError={() => setProfilePicture(null)}
                        />
                      ) : (
                        <div className="profile-picture-placeholder-large">
                          {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div 
                        className="profile-picture-overlay"
                        onClick={handleProfilePictureClick}
                        title="Profile picture options"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </div>
                      {isUploading && (
                        <div className="upload-loading">
                          <div className="loading-spinner"></div>
                        </div>
                      )}
                    </div>
                    
                    {showDropdown && (
                      <div className="profile-picture-dropdown">
                        <button 
                          className="dropdown-option"
                          onClick={handleChangePicture}
                          disabled={isUploading}
                        >
                          <IoCamera size={16} />
                          <span>{profilePicture ? 'Change Picture' : 'Add Picture'}</span>
                        </button>
                        {profilePicture && (
                          <button 
                            className="dropdown-option remove-option"
                            onClick={handleRemovePicture}
                            disabled={isUploading}
                          >
                            <IoTrash size={16} />
                            <span>Remove Picture</span>
                          </button>
                        )}
                      </div>
                    )}
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
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default PersonalInformation;
