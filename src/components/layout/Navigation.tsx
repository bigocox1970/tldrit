import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Newspaper, Save, Headphones } from 'lucide-react';

const Navigation: React.FC = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/summarize', icon: FileText, label: 'TL;DR' },
    { path: '/news', icon: Newspaper, label: 'News' },
    { path: '/saved', icon: Save, label: 'Saved' },
    { path: '/listen', icon: Headphones, label: 'Listen' },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 md:static md:bottom-auto md:left-auto md:right-auto bg-white dark:bg-gray-900 shadow-t md:shadow-none z-10">
      {/* Mobile bottom navigation */}
      <div className="md:hidden flex justify-around items-center py-3 border-t border-gray-200 dark:border-gray-800">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center ${
              isActive(item.path)
                ? 'text-blue-600 dark:text-blue-500'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <item.icon size={20} className="mb-1" />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
      
      {/* Desktop side navigation */}
      <div className="hidden md:flex md:flex-col md:w-64 md:h-full md:py-6 md:px-4 md:border-r md:border-gray-200 md:dark:border-gray-800">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg ${
                isActive(item.path)
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon size={20} className="mr-3" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;