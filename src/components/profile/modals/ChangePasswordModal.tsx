/**
 * ChangePasswordModal
 * ------------------------------------------------------------
 * This modal allows the *current authenticated user* to update
 * their password. Firebase requires "recent login" for sensitive
 * operations, so we re-authenticate using the user's current
 * password before calling updatePassword().
 *
 * UX notes:
 *  - Uses createPortal to render on top of everything else.
 *  - Blocks body scroll while open (see useEffect).
 *  - Provides toast feedback for success/failure.
 *
 * Security notes:
 *  - We never accept a userId; we always use auth.currentUser.
 *  - This ensures we cannot update another user’s password.
 * ------------------------------------------------------------
 */

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
  // ------------ State ------------
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

  // ------------ Accessibility + UX: ESC key + disable background scroll ------------
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);

      // Prevent background scrolling
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, onClose]);

  // ------------ Client-side validation ------------
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
    if (currentPassword === newPassword) {
      showLocalToast('New password must differ from current password', 'error');
      return false;
    }
    if (newPassword !== confirmPassword) {
      showLocalToast('Passwords do not match', 'error');
      return false;
    }
    return true;
  };

  // ------------ Firebase password change flow ------------
  const handleChangePassword = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const mod: any = await import('../../../firebase');
      const authClient =
        (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;

      const firebaseAuth = await import('firebase/auth');
      const user = authClient.currentUser;

      if (!user || !user.email) {
        throw new Error('No authenticated user');
      }

      // Re-authenticate using EmailAuthProvider
      const credential = firebaseAuth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await firebaseAuth.reauthenticateWithCredential(user, credential);

      // Update password
      await firebaseAuth.updatePassword(user, newPassword);

      // Success UX
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      showLocalToast('Password updated successfully', 'success');
      onSuccess('Password updated successfully');

      // Close modal after toast
      setTimeout(() => onClose(), 500);
    } catch (error: any) {
      let message = 'Unable to change password';

      if (error.code === 'auth/invalid-credential') {
        message = 'Current password is incorrect';
      } else if (error.code === 'auth/requires-recent-login') {
        message = 'Please log in again before changing your password';
      } else if (error.message) {
        message = error.message;
      }

      showLocalToast(message, 'error');
      onError(message);
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset when closing
  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  if (!isOpen) return null;

  // ------------ Modal markup (polished, accessible) ------------
  return createPortal(
    <div
      className="modal-overlay"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="modal-content account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="change-password-title">Change Password</h3>
          <p className="modal-subtitle">
            Please confirm your current password and enter a new one.
          </p>
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
              aria-required="true"
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
              aria-required="true"
            />
            <small className="field-hint">Must be at least 6 characters.</small>
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
              aria-required="true"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={handleChangePassword}
            disabled={loading}
          >
            {loading ? 'Changing…' : 'Change Password'}
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

