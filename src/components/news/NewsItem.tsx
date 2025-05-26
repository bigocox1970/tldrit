import React from 'react';
import { Headphones, Bookmark, BookmarkCheck } from 'lucide-react';
import { NewsItem as NewsItemType } from '../../types';
import Card, { CardContent } from '../ui/Card';
import { useNewsStore } from '../../store/newsStore';

interface NewsItemProps {
  item: NewsItemType;
  isSaved?: boolean;
  onSave?: () => void;
}

const NewsItem: React.FC<NewsItemProps> = ({ 
  item, 
  isSaved = false,
  onSave,
}) => {
  const { generateAudioForNewsItem, isLoading } = useNewsStore();
  
  const handleGenerateAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    generateAudioForNewsItem(item.id);
  };
  
  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      onSave();
    }
  };
  
  const handleClick = () => {
    window.open(item.sourceUrl, '_blank');
  };
  
  return (
    <Card 
      onClick={handleClick} 
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardContent className="p-0">
        {item.imageUrl && (
          <div className="w-full h-48 overflow-hidden">
            <img 
              src={item.imageUrl} 
              alt={item.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              {item.category}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(item.publishedAt).toLocaleDateString()}
            </span>
          </div>
          
          <h3 className="text-lg font-medium mb-2">{item.title}</h3>
          
          <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
            {item.summary}
          </p>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleSave}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {isSaved ? (
                <BookmarkCheck size={20} className="text-green-500" />
              ) : (
                <Bookmark size={20} className="text-gray-500 dark:text-gray-400" />
              )}
            </button>
            
            <button
              onClick={handleGenerateAudio}
              disabled={isLoading || !!item.audioUrl}
              className={`
                p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800
                ${isLoading || !!item.audioUrl ? 'opacity-50' : ''}
              `}
            >
              <Headphones 
                size={20} 
                className={item.audioUrl ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'} 
              />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsItem;