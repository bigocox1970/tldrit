import React, { useState } from 'react';
import InterestSelector from '../components/news/InterestSelector';
import NewsFeed from '../components/news/NewsFeed';
import { useAuthStore } from '../store/authStore';

const NewsPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [showTLDRPopup, setShowTLDRPopup] = useState(false);

  // Handler to be passed to NewsFeed/NewsItem
  const handleTLDRClick = () => {
    if (!isAuthenticated) {
      setShowTLDRPopup(true);
    }
  };

  return (
    <div>
      {/* <h1 className="text-2xl font-bold mb-6">News Feed</h1> */}
      
      {!isAuthenticated && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
          <p>Sign in to customize your news feed based on your interests and save articles.</p>
          <p className="text-sm mt-2">Currently showing general news from technology, world, and business categories.</p>
        </div>
      )}
      
      {isAuthenticated && <InterestSelector />}
      
      <NewsFeed onTLDRClick={handleTLDRClick} />
      {showTLDRPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <p className="text-lg font-semibold mb-4">Sign in or create a FREE account to use the TLDR feature.</p>
            <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShowTLDRPopup(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
