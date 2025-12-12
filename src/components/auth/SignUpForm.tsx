<<<<<<< HEAD
// src/components/SignUpForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Firebase is loaded lazily to avoid bundling the SDK in the initial bundle.
const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firebaseAuth = await import('firebase/auth');
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firebaseAuth, firestore };
};

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
      const { authClient, dbClient, firebaseAuth, firestore } = await resolveFirebase();
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(authClient, email, password);
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      await firestore.setDoc(firestore.doc(dbClient, 'users', userCredential.user.uid), {
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
=======
// src/components/SignUpForm.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Firebase is loaded lazily to avoid bundling the SDK in the initial bundle.
const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firebaseAuth = await import('firebase/auth');
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firebaseAuth, firestore };
};

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
      const { authClient, dbClient, firebaseAuth, firestore } = await resolveFirebase();
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(authClient, email, password);
      await firebaseAuth.updateProfile(userCredential.user, { displayName: name });
      await firestore.setDoc(firestore.doc(dbClient, 'users', userCredential.user.uid), {
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
>>>>>>> 3449604f23503c51d893151942e46f034bb45a8d
