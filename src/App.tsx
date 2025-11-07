import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import GlobalSidebar from './components/ui/GlobalSidebar';
import BackgroundBlobs from './components/ui/BackgroundBlobs';
import SignUpForm from './components/auth/SignUpForm';
import SignInForm from './components/auth/SignInForm';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import MealTrackerPage from './pages/MealTrackerPage';

function AppContent() {
  // Hide sidebar and switch to minimal auth layout on auth routes
  const location = useLocation();
  const isAuth = location.pathname === '/signin' || location.pathname === '/signup';

  return (
    <div className="app-container">
      {/* Autonomous decorative background blobs (non-interactive, behind UI) */}
      <BackgroundBlobs />
      {!isAuth && <GlobalSidebar />}
      <div className={"app-layout" + (isAuth ? " no-sidebar" : "")}>
        <main className={
          "main-content" +
          (isAuth ? " auth-solo" : " minimal")
        }>
          <Routes>
            <Route path="/" element={<Navigate to="/signin" replace />} />
            <Route path="/signup" element={<SignUpForm />} />
            <Route path="/signin" element={<SignInForm />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/meals" element={<MealTrackerPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;