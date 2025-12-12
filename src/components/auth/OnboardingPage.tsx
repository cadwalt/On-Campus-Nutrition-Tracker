<<<<<<< HEAD
// Example: LoginForm.tsx
import React, {  } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  // ...existing login logic...

  return (
    <div className="auth-form">
      <h3 className="auth-title">Sign In</h3>
      <form className="auth-form-content">
        {/* ...login fields... */}
        <button type="submit" className="auth-button">
          Sign In
        </button>
      </form>
      {/* Add link to sign up page */}
      <div className="auth-switch">
        <span>Don’t have an account?</span>
        <button
          type="button"
          className="auth-link"
          onClick={() => navigate('/signup')}
        >
          Create one
        </button>
      </div>
    </div>
  );
};

=======
// Example: LoginForm.tsx
import React, {  } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  // ...existing login logic...

  return (
    <div className="auth-form">
      <h3 className="auth-title">Sign In</h3>
      <form className="auth-form-content">
        {/* ...login fields... */}
        <button type="submit" className="auth-button">
          Sign In
        </button>
      </form>
      {/* Add link to sign up page */}
      <div className="auth-switch">
        <span>Don’t have an account?</span>
        <button
          type="button"
          className="auth-link"
          onClick={() => navigate('/signup')}
        >
          Create one
        </button>
      </div>
    </div>
  );
};

>>>>>>> 3449604f23503c51d893151942e46f034bb45a8d
export default LoginForm;