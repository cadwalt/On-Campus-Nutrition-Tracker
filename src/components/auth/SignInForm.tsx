// src/components/SignInForm.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../../firebase'; // Import your initialized auth instance

const SignInForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null); // To show logged-in state

  // Listen for authentication state changes (who is logged in)
  // This is a basic example; for a full app, you'd manage this state higher up
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail(null);
      }
    });
    return () => unsubscribe(); // Clean up the listener
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User is now logged in, onAuthStateChanged will update the UI
      setEmail('');
      setPassword('');
    } catch (firebaseError: any) {
      setError(firebaseError.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // User is now logged out, onAuthStateChanged will update the UI
    } catch (firebaseError: any) {
      setError(firebaseError.message);
    }
  };

  return (
    <div className="auth-form">
      {userEmail ? (
        <div className="user-welcome">
          <h3>Welcome, {userEmail}!</h3>
          <button className="sign-out-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <>
          <h3 className="auth-title">Sign In</h3>
          <form onSubmit={handleSignIn} className="auth-form-content">
            <div className="form-group">
              <label htmlFor="signInEmail">Email:</label>
              <input
                type="email"
                id="signInEmail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="signInPassword">Password:</label>
              <input
                type="password"
                id="signInPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                required
              />
            </div>
            <button type="submit" className="auth-button">Sign In</button>
            {error && <p className="error-message">{error}</p>}
          </form>
        </>
      )}
    </div>
  );
};

export default SignInForm;
