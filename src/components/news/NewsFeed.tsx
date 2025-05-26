import React, { useEffect } from 'react';
import { useNewsStore } from '../../store/newsStore';
import NewsItem from './NewsItem';
import Button from '../ui/Button';
import { RefreshCw } from 'lucide-react';

const NewsFeed: React.FC = () => {
  const { newsItems, fetchNewsItems, refreshNews, isLoading } = useNewsStore();
  
  useEffect(() => {
    fetchNewsItems();
  }, [fetchNewsItems]);
  
  const handleRefresh = async () => {
    await refreshNews();
  };
  
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
          No news items found. Try selecting more interests or refresh the feed.
        </p>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh Feed
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw size={16} className="mr-2" />
          {isLoading ? 'Refreshing...' : 'Refresh Feed'}
        </Button>
      </div>
      
      <div className="space-y-6">
        {newsItems.map(item => (
          <NewsItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;