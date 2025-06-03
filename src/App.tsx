import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import Layout from './components/layout/Layout';

// Pages
import HomePage from './pages/HomePage';
import SummarizePage from './pages/SummarizePage';
import NewsPage from './pages/NewsPage';
import SavedPage from './pages/SavedPage';
import ListenPage from './pages/ListenPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import PricingPlans from './components/subscription/PricingPlans';
import TermsPage from './pages/terms';
import PWAInstallGuide from './pages/PWAInstallGuide';

// Define protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { checkAuthState } = useAuthStore();
  
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);
  
  return (
    <Router>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="summarize" element={<SummarizePage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="saved" element={<SavedPage />} />
          <Route path="listen" element={<ListenPage />} />
          <Route path="profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="pricing" element={<PricingPlans />} />
          <Route path="terms/*" element={<TermsPage />} />
          <Route path="install" element={<PWAInstallGuide />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;