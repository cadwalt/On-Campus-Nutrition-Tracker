import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Toast from '../../ui/Toast';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);

  const showLocalToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Handle ESC key to close modal and body scroll management
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, onClose]);

  const validateInputs = (): boolean => {
    if (!currentPassword.trim()) {
      showLocalToast('Current password is required', 'error');
      return false;
    }
    if (!newPassword.trim()) {
      showLocalToast('New password is required', 'error');
      return false;
    }
    if (newPassword.length < 6) {
      showLocalToast('New password must be at least 6 characters', 'error');
      return false;
    }
    if (newPassword !== confirmPassword) {
      showLocalToast('Passwords do not match', 'error');
      return false;
    }
    if (currentPassword === newPassword) {
      showLocalToast('New password must be different from current password', 'error');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate the user before changing password
      const mod: any = await import('../../../firebase');
      const authClient = (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;
      const firebaseAuth = await import('firebase/auth');
      const user = authClient.currentUser;

      if (!user || !user.email) {
        throw new Error('No user logged in');
      }

      // Re-authenticate with current password
      const credential = firebaseAuth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await firebaseAuth.reauthenticateWithCredential(user, credential);

      // Update password
      await firebaseAuth.updatePassword(user, newPassword);

      // Clear form and close modal
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showLocalToast('Password changed successfully', 'success');
      onSuccess('Password changed successfully');
      
      // Close modal after a short delay to show the toast
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: any) {
      let errorMessage = 'Failed to change password';
      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Current password is incorrect';
      } else if (error.code === 'auth/password-does-not-meet-requirements') {
        errorMessage = 'New password must include at least 1 lowercase letter';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Please sign out and sign in again before changing your password';
      } else if (error.message) {
        errorMessage = error.message;
      }
      showLocalToast(errorMessage, 'error');
      onError(errorMessage);
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Change Password</h3>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              disabled={loading}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
            style={{ backgroundColor: 'black', color: 'white' }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleChangePassword}
            disabled={loading}
            style={{ backgroundColor: 'black', color: 'white' }}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <Toast
            message={toastMessage}
            type={toastType}
            isVisible={showToast}
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </div>,
    document.body
  );
};

export default ChangePasswordModal;
