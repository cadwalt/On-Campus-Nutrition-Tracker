// src/components/SignUpForm.tsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; // Import your initialized auth instance

const SignUpForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setSuccess(null); // Clear previous success messages
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccess('Account created successfully! You can now log in.');
      setEmail('');
      setPassword('');
      // Optionally, you might want to redirect the user or log them in automatically
    } catch (firebaseError: any) {
      setError(firebaseError.message);
    }
  };

  return (
    <div className="auth-form">
      <h3 className="auth-title">Create Account</h3>
      <form onSubmit={handleSignUp} className="auth-form-content">
        <div className="form-group">
          <label htmlFor="signUpEmail">Email:</label>
          <input
            type="email"
            id="signUpEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="signUpPassword">Password:</label>
          <input
            type="password"
            id="signUpPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
          />
        </div>
        <button type="submit" className="auth-button">Sign Up</button>
        {success && <p className="success-message">{success}</p>}
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default SignUpForm;
