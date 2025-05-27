import React, { useEffect, useCallback } from 'react';
import { useNewsStore } from '../../store/newsStore';
import NewsItem from './NewsItem';

const NewsFeed: React.FC = () => {
  const { newsItems, fetchNewsItems, isLoading } = useNewsStore();
  
  // Memoize the fetch function to prevent unnecessary re-renders
  const memoizedFetchNewsItems = useCallback(() => {
    fetchNewsItems();
  }, [fetchNewsItems]);
  
  useEffect(() => {
    memoizedFetchNewsItems();
  }, [memoizedFetchNewsItems]);
  
  if (isLoading && newsItems.length === 0) {
    return (
      <div className="py-8 text-center">
        <p>Loading news feed...</p>
      </div>
    );
  }
  
  if (newsItems.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No news items found. Try selecting more interests.
        </p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="space-y-6">
        {newsItems.map(item => (
          <NewsItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
