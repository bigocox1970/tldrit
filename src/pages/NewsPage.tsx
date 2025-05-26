import React from 'react';
import InterestSelector from '../components/news/InterestSelector';
import NewsFeed from '../components/news/NewsFeed';
import { useAuthStore } from '../store/authStore';

const NewsPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">News Feed</h1>
      
      {!isAuthenticated && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
          <p>Sign in to customize your news feed based on your interests and save articles.</p>
          <p className="text-sm mt-2">Currently showing general news from technology, world, and business categories.</p>
        </div>
      )}
      
      {isAuthenticated && <InterestSelector />}
      
      <NewsFeed />
    </div>
  );
};

export default NewsPage;
