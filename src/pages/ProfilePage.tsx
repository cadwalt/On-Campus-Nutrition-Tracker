import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import Toast from '../components/Toast';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const showToastNotification = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const hideToast = () => {
    setShowToast(false);
    setToastMessage(null);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        // Load allergens from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setSelectedAllergens(data.allergens || []);
        }
      }
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
      
      console.log("Display name updated in Firebase Auth!");
      console.log("Current user's display name:", user.displayName);
      
      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: newDisplayName.trim(),
        updated_at: new Date()
      });
      
      console.log("✅ User document updated in Firestore!");
      console.log("Updated name in Firestore:", newDisplayName.trim());
      
      // Force a reload to ensure the user object is fully updated
      await user.reload();
      console.log("Reloaded user display name:", user.displayName);
      
      showToastNotification('Profile updated successfully!', 'success');
      setIsEditing(false);
      setNewDisplayName('');
      
      // Update the local user state to reflect the change
      setUser(user);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showToastNotification(error.message || 'Failed to update profile', 'error');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleAllergenChange = (allergen: string) => {
    setSelectedAllergens(prev =>
      prev.includes(allergen)
        ? prev.filter(a => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSaveAllergens = async () => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        allergens: selectedAllergens,
        updated_at: new Date()
      });
      showToastNotification('Allergens saved successfully!', 'success');
    } catch (error: any) {
      showToastNotification(error.message || 'Failed to save allergens', 'error');
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

  // Top 9 allergens
  const ALLERGENS = [
    "Milk",
    "Eggs",
    "Fish",
    "Crustacean shellfish",
    "Tree nuts",
    "Peanuts",
    "Wheat",
    "Soybeans",
    "Sesame"
  ];

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Profile</h1>
        <p>Manage your account settings and preferences</p>
      </div>

      <main className="profile-content">
        {/* Profile Information Section */}
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

        {/* Allergens Section */}
        <div className="profile-section">
          <div className="section-header">
            <h2>Dietary Restrictions</h2>
          </div>
          <div className="profile-card">
            <div className="allergen-section">
              <div className="section-description">
                <p>Select any allergens to help us provide better meal recommendations.</p>
              </div>
              
              <div className="allergen-grid">
                {ALLERGENS.map(allergen => (
                  <label key={allergen} className="allergen-item">
                    <input
                      type="checkbox"
                      checked={selectedAllergens.includes(allergen)}
                      onChange={() => handleAllergenChange(allergen)}
                      className="allergen-checkbox"
                    />
                    <span className="allergen-label">{allergen}</span>
                  </label>
                ))}
              </div>
              
              <div className="section-actions">
                <button onClick={handleSaveAllergens} className="save-section-button">
                  Save Allergens
                </button>
                <span className="section-status">
                  {selectedAllergens.length > 0 
                    ? `${selectedAllergens.length} allergen${selectedAllergens.length > 1 ? 's' : ''} selected`
                    : 'No allergens selected'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
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
      </main>
      
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          isVisible={showToast}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default ProfilePage;

