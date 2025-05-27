import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Home';
      case '/summarize':
        return 'TL;DR';
      case '/news':
        return 'News';
      case '/listen':
        return 'Listen';
      case '/saved':
        return 'Saved TL;DRs';
      case '/login':
        return 'Login';
      case '/register':
        return 'Register';
      case '/profile':
        return 'Profile';
      default:
        return 'TLDRit';
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex justify-between items-center py-4">
          {/* Logo (no hamburger menu) */}
          <div className="flex items-center z-10">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500">
                TLDR<em>it</em>
              </span>
            </Link>
          </div>

          {/* Page title - show on all views, center over main content on desktop */}
          <div
            className="
              flex-1 flex justify-center
              text-lg font-semibold text-gray-800 dark:text-gray-200
              md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
              md:w-[48rem] md:max-w-3xl md:justify-center
            "
          >
            {getPageTitle()}
          </div>

          {/* Search and actions */}
          <div className="hidden md:flex items-center space-x-4 z-10">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <User size={20} />
              </button>
            </div>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center space-x-2 z-10">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <User size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
