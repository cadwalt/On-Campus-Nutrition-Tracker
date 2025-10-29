import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  duration = 2500 
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready, then trigger animation
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      
      const autoCloseTimer = setTimeout(() => {
        setIsAnimating(false);
        // Wait for exit animation to complete before calling onClose
        setTimeout(() => {
          onClose();
        }, 500); // Match CSS transition duration
      }, duration);

      return () => {
        clearTimeout(timer);
        clearTimeout(autoCloseTimer);
      };
    } else {
      // Start exit animation
      setIsAnimating(false);
      // Remove from DOM after animation completes
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500); // Match CSS transition duration
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!shouldRender) return null;

  const toastElement = (
    <div className={`toast toast-${type} ${isAnimating ? 'toast-visible' : ''}`}>
      <div className="toast-content">
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );

  // Render the toast directly to document.body using Portal
  return createPortal(toastElement, document.body);
};

export default Toast;
