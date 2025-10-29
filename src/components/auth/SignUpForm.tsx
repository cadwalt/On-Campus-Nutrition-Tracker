// src/components/SignUpForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

const SignUpForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name.trim(),
        email: email,
        profile_picture: null,
        created_at: new Date(),
        updated_at: new Date()
      });
      setSuccess('Account created! Redirecting...');
      setTimeout(() => navigate('/onboarding'), 1000);
    } catch (firebaseError: any) {
      setError(firebaseError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-centered">
      <div className="auth-form">
        <h3 className="auth-title">Create Account</h3>
        <form onSubmit={handleSignUp} className="auth-form-content">
          <div className="form-group">
            <label htmlFor="signUpName">Name:</label>
            <input
              type="text"
              id="signUpName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="auth-input"
              required
            />
          </div>
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
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
          {success && <p className="success-message">{success}</p>}
          {error && <p className="error-message">{error}</p>}
        </form>
        <div className="auth-switch">
          <span>Already have an account?</span>
          <button
            type="button"
            className="auth-link"
            onClick={() => navigate('/signin')}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;
