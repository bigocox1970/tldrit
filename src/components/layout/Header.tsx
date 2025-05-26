import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Search, Sun, X, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

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
        <div className="flex justify-between items-center py-4">
          {/* Logo and mobile menu button */}
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden mr-2 p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={toggleMenu}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500">
                TLDRit
              </span>
            </Link>
          </div>

          {/* Page title - mobile only */}
          <div className="md:hidden text-lg font-semibold text-gray-800 dark:text-gray-200">
            {getPageTitle()}
          </div>

          {/* Search and actions */}
          <div className="hidden md:flex items-center space-x-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search or paste URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </form>

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

              {isAuthenticated ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => logout()}
                >
                  Sign Out
                </Button>
              ) : (
                <Link to="/login">
                  <Button variant="primary" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center space-x-2">
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

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 shadow-lg py-2 px-4">
          <form onSubmit={handleSearch} className="relative mb-4">
            <input
              type="text"
              placeholder="Search or paste URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </form>
          
          <div className="space-y-2">
            {isAuthenticated ? (
              <Button 
                variant="outline" 
                fullWidth
                onClick={() => logout()}
              >
                Sign Out
              </Button>
            ) : (
              <div className="space-y-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="primary" fullWidth>
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" fullWidth>
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;