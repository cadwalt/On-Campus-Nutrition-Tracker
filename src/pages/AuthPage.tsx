import React from 'react';
import { Link } from 'react-router-dom';
import SignInForm from '../components/SignInForm';
import SignUpForm from '../components/SignUpForm';

const AuthPage: React.FC = () => {
  return (
    <div className="auth-page">
      <div className="auth-page-header">
        <h1>Welcome to On-Campus Nutrition Tracker</h1>
        <p>Sign in to your account or create a new one to get started</p>
      </div>
      
      <div className="auth-section">
        <SignInForm />
        <SignUpForm />
      </div>
      
      <div className="auth-page-footer">
        <p>Already have an account? <Link to="/dashboard">Go to Dashboard</Link></p>
      </div>
    </div>
  );
};

export default AuthPage;
