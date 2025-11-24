// src/components/SignInForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword,  } from 'firebase/auth';
import { auth, } from '../../firebase';

const welcomeMessages = [
  "Welcome back!",
  "Again so soon?",
  "Glad to see you!",
  "Hello again!",
  "Nice to have you back!"
];

const SignInForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null); // <-- Change from userEmail to userName
  const [showWelcome, setShowWelcome] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState(welcomeMessages[0]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setShowWelcome(true);
        setFadeOut(false);
        setVisible(false);
        setWelcomeMsg(welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);
        // Fade in
        setTimeout(() => setVisible(true), 50);
        // Fade out after 1.5s
        setTimeout(() => setFadeOut(true), 1500);
        // Navigate after 3s
        setTimeout(() => {
          setShowWelcome(false);
          setFadeOut(false);
          setVisible(false);
          navigate('/dashboard');
        }, 3000);
      } else {
        setShowWelcome(false);
        setFadeOut(false);
        setVisible(false);
        setUserName(null);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setLoading(true); // Start loading
    try {
      // Add your sign-up logic here
      // For example, createUserWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      // Navigate to a different page on successful sign-up, if needed
    } catch (firebaseError: any) {
      setError(firebaseError.message);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div className="auth-form-centered">
      <div className="auth-form">
        {showWelcome ? (
          <div className={`user-welcome${visible ? ' visible' : ''}${fadeOut ? ' fade-out' : ''}`}>
            <h3>{welcomeMsg}</h3>
            {userName && <h4>Welcome, {userName}!</h4>}
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
              <button type="submit" className="auth-button">
                Sign In
              </button>
              {error && <p className="error-message">{error}</p>}
            </form>
            <div className="auth-switch">
              <span>New user?</span>
              <button
                type="button"
                className="auth-link"
                onClick={() => navigate('/signup')}
              >
                Sign up!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SignInForm;
