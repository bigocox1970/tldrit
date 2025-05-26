import React, { useState } from 'react';
import { Headphones, Bookmark, BookmarkCheck, FileText, ChevronDown, ChevronUp, Settings } from 'lucide-react';
import { NewsItem as NewsItemType } from '../../types';
import Card, { CardContent } from '../ui/Card';
import { useNewsStore } from '../../store/newsStore';
import { useAuthStore } from '../../store/authStore';
import Slider from '../ui/Slider';
import Toggle from '../ui/Toggle';

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
  const { generateAudioForNewsItem, generateTLDRForNewsItem, isLoading, tldrLoading } = useNewsStore();
  const { user } = useAuthStore();
  const [showTLDR, setShowTLDR] = useState(false);
  const [showTLDRSettings, setShowTLDRSettings] = useState(false);
  const [summaryLevel, setSummaryLevel] = useState(2); // Default to short
  const [isEli5, setIsEli5] = useState(false);
  const [eli5Level, setEli5Level] = useState(10);
  
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

  const handleGenerateTLDR = (e: React.MouseEvent) => {
    e.stopPropagation();
    generateTLDRForNewsItem(item.id, {
      summaryLevel,
      isEli5,
      eli5Level: isEli5 ? eli5Level : undefined
    });
    setShowTLDR(true);
  };

  const handleToggleTLDR = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTLDR(!showTLDR);
  };

  const handleToggleTLDRSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTLDRSettings(!showTLDRSettings);
  };
  
  const handleClick = () => {
    window.open(item.sourceUrl, '_blank');
  };

  const isTLDRLoading = tldrLoading[item.id] || false;

  const getSummaryLevelText = (level: number) => {
    const levels = {
      1: 'Very Short',
      2: 'Short',
      3: 'Medium',
      4: 'Detailed',
      5: 'Comprehensive'
    };
    return levels[level as keyof typeof levels] || 'Medium';
  };
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {item.imageUrl && (
          <div className="w-full h-48 overflow-hidden">
            <img 
              src={item.imageUrl} 
              alt={item.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
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
          
          <h3 
            className="text-lg font-medium mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={handleClick}
          >
            {item.title}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
            {item.summary}
          </p>

          {/* TLDR Settings */}
          {showTLDRSettings && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Settings size={16} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    TLDR Settings
                  </span>
                </div>
                <button
                  onClick={handleToggleTLDRSettings}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ChevronUp size={16} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Summary Length: {getSummaryLevelText(summaryLevel)}
                  </label>
                  <Slider
                    value={summaryLevel}
                    onChange={setSummaryLevel}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ELI5 Mode (Explain Like I'm 5)
                  </span>
                  <Toggle
                    isOn={isEli5}
                    onToggle={() => setIsEli5(!isEli5)}
                  />
                </div>

                {isEli5 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Age Level: {eli5Level} years old
                    </label>
                    <Slider
                      value={eli5Level}
                      onChange={setEli5Level}
                      min={5}
                      max={15}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TLDR Section */}
          {(item.tldr || showTLDR) && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    TLDR Summary
                  </span>
                </div>
                <button
                  onClick={handleToggleTLDR}
                  className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800"
                >
                  {showTLDR ? (
                    <ChevronUp size={16} className="text-blue-600 dark:text-blue-400" />
                  ) : (
                    <ChevronDown size={16} className="text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              </div>
              
              {showTLDR && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {isTLDRLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Generating TLDR summary...</span>
                    </div>
                  ) : item.tldr ? (
                    <p>{item.tldr}</p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      Click the TLDR button to generate a summary
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isSaved ? "Remove from saved" : "Save article"}
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
                  p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                  ${isLoading || !!item.audioUrl ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title={item.audioUrl ? "Audio available" : "Generate audio"}
              >
                <Headphones 
                  size={20} 
                  className={item.audioUrl ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'} 
                />
              </button>

              <div className="flex items-center">
                <button
                  onClick={item.tldr ? handleToggleTLDR : handleGenerateTLDR}
                  disabled={isTLDRLoading || !user}
                  className={`
                    flex items-center space-x-1 px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                    ${isTLDRLoading || !user ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title={!user ? "Login required for TLDR" : item.tldr ? "Toggle TLDR" : "Generate TLDR"}
                >
                  {isTLDRLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  ) : (
                    <FileText 
                      size={20} 
                      className={item.tldr ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'} 
                    />
                  )}
                  <span className={`text-sm font-medium ${item.tldr ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    TLDR
                  </span>
                </button>

                {user && !item.tldr && (
                  <button
                    onClick={handleToggleTLDRSettings}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1"
                    title="TLDR Settings"
                  >
                    <Settings 
                      size={16} 
                      className="text-gray-500 dark:text-gray-400" 
                    />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleClick}
              className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition-colors"
            >
              Read Full Article →
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsItem;
