import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, User, CheckSquare, Trash2 } from 'lucide-react';
import { useSummaryStore } from '../../store/summaryStore';
import { useNewsStore } from '../../store/newsStore';

interface HeaderProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    selectedSummaries,
    isEditMode,
    setEditMode,
    deleteSummaries,
    removeFromPlaylist,
    selectedListenItems,
    isListenEditMode,
    setListenEditMode,
    fetchSummaries
  } = useSummaryStore();
  
  const {
    selectedListenNewsItems,
    isListenNewsEditMode,
    setListenNewsEditMode,
    removeNewsFromPlaylist,
    selectedSavedNewsItems,
    isSavedNewsEditMode,
    setSavedNewsEditMode,
    deleteSelectedNewsItems
  } = useNewsStore();

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

  const isSavedPage = location.pathname === '/saved';
  const isListenPage = location.pathname === '/listen';
  const hasSelections = selectedSummaries.length > 0 || selectedSavedNewsItems.length > 0;
  const hasListenSelections = selectedListenItems.length > 0 || selectedListenNewsItems.length > 0;
  const isInEditMode = isEditMode || isListenEditMode || isListenNewsEditMode || isSavedNewsEditMode;

  const handleDeleteClick = async () => {
    if (isSavedPage && window.confirm('Are you sure you want to delete the selected items?')) {
      // Handle both summary and news item deletion on saved page
      if (selectedSummaries.length > 0) {
        await deleteSummaries(selectedSummaries);
      }
      if (selectedSavedNewsItems.length > 0) {
        await deleteSelectedNewsItems(selectedSavedNewsItems);
      }
      // Refresh summaries data after delete operations
      await fetchSummaries();
      // Dispatch custom event to refresh bookmarked news without full page reload
      window.dispatchEvent(new CustomEvent('refreshBookmarkedNews'));
    } else if (isListenPage && window.confirm('Are you sure you want to remove the selected items from your playlist?')) {
      // Handle both summary and news item removal from playlist
      if (selectedListenItems.length > 0) {
        await removeFromPlaylist(selectedListenItems);
      }
      if (selectedListenNewsItems.length > 0) {
        await removeNewsFromPlaylist(selectedListenNewsItems);
      }
      // Refresh summaries data after removal operations
      await fetchSummaries();
    }
  };

  const handleSelectClick = () => {
    if (isSavedPage) {
      // Toggle saved edit mode for both summaries and news
      const newEditMode = !isEditMode && !isSavedNewsEditMode;
      setEditMode(newEditMode);
      setSavedNewsEditMode(newEditMode);
    } else if (isListenPage) {
      // Toggle listen edit mode for both summaries and news
      const newEditMode = !isListenEditMode && !isListenNewsEditMode;
      setListenEditMode(newEditMode);
      setListenNewsEditMode(newEditMode);
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
              {(isSavedPage && !hasSelections) && (
                <button
                  type="button"
                  onClick={handleSelectClick}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title={isEditMode ? "Exit select mode" : "Enter select mode"}
                >
                  <CheckSquare size={20} />
                </button>
              )}
              {(isListenPage && !hasListenSelections) && (
                <button
                  type="button"
                  onClick={handleSelectClick}
                  className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title={isInEditMode ? "Exit select mode" : "Enter select mode"}
                >
                  <CheckSquare size={20} />
                </button>
              )}
              {(hasSelections || hasListenSelections) && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="p-2 rounded-full text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                  title={isSavedPage ? "Delete selected" : "Remove from playlist"}
                >
                  <Trash2 size={20} />
                </button>
              )}
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
            {(isSavedPage && !hasSelections) && (
              <button
                type="button"
                onClick={handleSelectClick}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                title={isEditMode ? "Exit select mode" : "Enter select mode"}
              >
                <CheckSquare size={20} />
              </button>
            )}
            {(isListenPage && !hasListenSelections) && (
              <button
                type="button"
                onClick={handleSelectClick}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                title={isInEditMode ? "Exit select mode" : "Enter select mode"}
              >
                <CheckSquare size={20} />
              </button>
            )}
            {(hasSelections || hasListenSelections) && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="p-2 rounded-full text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                title={isSavedPage ? "Delete selected" : "Remove from playlist"}
              >
                <Trash2 size={20} />
              </button>
            )}
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
