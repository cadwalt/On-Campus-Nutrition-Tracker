// src/components/auth/SignInForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Fun welcome messages when sign-in succeeds
const welcomeMessages = [
  'Welcome back!',
  'Glad to see you!',
  'Hello again!',
  'Nice to have you back!',
  'Welcome back, friend!',
  'Good to have you here!',
  'Greetings, Food Warrior!',
  'Your culinary journey continues!',
  'Welcome, Big Back!',
  'Dinner Dinner! Chicken Winner!',
];

const SignInForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null); // for "reset email sent" message
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState(welcomeMessages[0]);
  const navigate = useNavigate();

  // Resolve an auth client from the local firebase module whether it exposes
  // an async getter (`getAuthClient`) or a synchronous `auth` instance.
  const resolveAuthClient = async () => {
    const firebaseMod: any = await import('../../firebase');
    const getter =
      firebaseMod.getAuthClient ?? firebaseMod.default?.getAuthClient ?? firebaseMod.default;
    if (typeof getter === 'function') return await getter();
    if (firebaseMod.auth) return firebaseMod.auth;
    if (firebaseMod.default && firebaseMod.default.auth) return firebaseMod.default.auth;
    throw new Error('getAuthClient not found on firebase module');
  };

  // Listen for auth state changes to drive the welcome animation + redirect
  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const authClient = await resolveAuthClient();
        const { onAuthStateChanged } = await import('firebase/auth');
        unsub = onAuthStateChanged(authClient, (user) => {
          if (!mounted) return;
          if (user) {
            setUserName(user.displayName ?? null);
            setShowWelcome(true);
            setFadeOut(false);
            setVisible(false);
            setWelcomeMsg(
              welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)],
            );
            // Fade in
            setTimeout(() => setVisible(true), 50);
            // Fade out after 1.5s
            setTimeout(() => setFadeOut(true), 1500);
            // Navigate after 3s
            setTimeout(() => {
              if (!mounted) return;
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
      } catch (err) {
        console.error('Failed to initialize auth listener', err);
      }
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const authClient = await resolveAuthClient();
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      await signInWithEmailAndPassword(authClient, email, password);
      // User is now logged in; onAuthStateChanged will handle redirect
      setEmail('');
      setPassword('');
    } catch (firebaseError: any) {
      const code: string | undefined = firebaseError?.code || firebaseError?.message;
      if (typeof code === 'string' && code.includes('auth/invalid-api-key')) {
        setError(
          'Firebase configuration error: missing or invalid API key. Check your VITE_FIREBASE_* env vars in your hosting provider (e.g. Vercel) and rebuild.',
        );
      } else {
        setError(firebaseError?.message ?? String(firebaseError));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      // Placeholder: sign-up is handled by a different form on this page,
      // but we keep this here in case we ever want to reuse this component.
      setEmail('');
      setPassword('');
    } catch (firebaseError: any) {
      setError(firebaseError.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle "Forgot password?" action: send reset email via Firebase
  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);

    if (!email) {
      setError("Please enter your email above, then click 'Forgot password?' again.");
      return;
    }

    try {
      const authClient = await resolveAuthClient();
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(authClient, email);
      setInfo(`Password reset email sent to ${email}. Please check your inbox.`);
    } catch (firebaseError: any) {
      const message = firebaseError?.message ?? String(firebaseError);
      setError(message);
    }
  };

  return (
    <div className="auth-form-centered">
      <div className="auth-form">
        {showWelcome ? (
          <div
            className={`user-welcome${visible ? ' visible' : ''}${
              fadeOut ? ' fade-out' : ''
            }`}
          >
            <h3>{welcomeMsg}</h3>
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

              <button
                type="submit"
                className="auth-button"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              {/* Forgot password link + messages */}
              <div className="auth-secondary-actions">
                <button
                  type="button"
                  className="auth-link"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              {info && (
                <p className="info-message" role="status">
                  {info}
                </p>
              )}
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
