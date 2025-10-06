import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import GlobalSidebar from './components/ui/GlobalSidebar';
import SignUpForm from './components/auth/SignUpForm';
import SignInForm from './components/auth/SignInForm';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';

function App() {
  // Optional: Hide sidebar on auth pages
  const location = window.location.pathname;
  const hideSidebar = location === '/signin' || location === '/signup';

  return (
    <Router>
      <div className="app-container">
        {!hideSidebar && <GlobalSidebar />}
        <div className="app-layout">
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/signin" replace />} />
              <Route path="/signup" element={<SignUpForm />} />
              <Route path="/signin" element={<SignInForm />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;