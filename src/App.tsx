import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import GlobalSidebar from './components/ui/GlobalSidebar';
import MobileNavMenu from './components/ui/MobileNavMenu';
import BackgroundBlobs from './components/ui/BackgroundBlobs';
import React, { Suspense } from 'react';

// Lazy-load route pages to split bundle and improve initial load
const SignUpForm = React.lazy(() => import('./components/auth/SignUpForm'));
const SignInForm = React.lazy(() => import('./components/auth/SignInForm'));
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const MealTrackerPage = React.lazy(() => import('./pages/MealTrackerPage'));
const PreferencesPage = React.lazy(() => import('./pages/PreferencesPage'));
const AiAssistantPage = React.lazy(() => import('./pages/AiAssistantPage'));
const WaterIntakePage = React.lazy(() => import('./pages/WaterIntakePage'));
const WeightTrackerPage = React.lazy(() => import('./pages/WeightTrackerPage'));

function AppContent() {
  // Hide sidebar and switch to minimal auth layout on auth routes
  const location = useLocation();
  const isAuth = location.pathname === '/signin' || location.pathname === '/signup';

  return (
    <div className="app-container">
      {/* Autonomous decorative background blobs (non-interactive, behind UI) */}
      <BackgroundBlobs />
      {!isAuth && <MobileNavMenu />}
      {!isAuth && <GlobalSidebar />}
      <div className={"app-layout" + (isAuth ? " no-sidebar" : "")}>
        <main className={
          "main-content" +
          (isAuth ? " auth-solo" : " minimal")
        }>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/signin" replace />} />
              <Route path="/signup" element={<SignUpForm />} />
              <Route path="/signin" element={<SignInForm />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/meals" element={<MealTrackerPage />} />
              <Route path="/preferences" element={<PreferencesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/ai-assistant" element={<AiAssistantPage />} />
              <Route path="/water-intake" element={<WaterIntakePage />} />
              <Route path="/weight" element={<WeightTrackerPage />} />
              <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
          </Suspense>
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