import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';
import { useAuthStore } from '../../store/authStore';

const Layout: React.FC = () => {
  const { checkAuthState } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('darkMode');
    return stored === 'true';
  });
  
  // Handle dark mode changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);
  
  // Check auth state on mount
  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);
  
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
      <Header isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
      
      <div className="flex flex-col md:flex-row flex-1">
        <Navigation />
        
        <main className="flex-1 pb-16 md:pb-0 md:pt-0 px-4 sm:px-6 md:px-8">
          <div className="max-w-3xl mx-auto pt-4 pb-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;