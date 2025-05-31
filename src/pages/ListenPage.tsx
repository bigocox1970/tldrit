import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import { useAudioStore } from '../store/audioStore';
import { useNewsStore } from '../store/newsStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getExampleSummaries, getPlaylistNewsItems } from '../lib/supabase';
import { Summary } from '../types';
import { FileText, Headphones, Newspaper, Play, Pause, CheckSquare, Square } from 'lucide-react';

interface PlaylistNewsItem {
  id: string;
  title: string;
  sourceUrl: string;
  summary: string;
  tldr?: string;
  audioUrl?: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
}

const ListenPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { 
    summaries, 
    fetchSummaries, 
    isLoading,
    selectedListenItems,
    setSelectedListenItems,
    isListenEditMode
  } = useSummaryStore();
  const { currentlyPlaying, isPlaying, toggleAudio } = useAudioStore();
  const { 
    selectedListenNewsItems,
    setSelectedListenNewsItems,
    isListenNewsEditMode
  } = useNewsStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'summaries' | 'news'>('summaries');
  
  // Regular summaries state
  const [exampleSummaries, setExampleSummaries] = useState<Summary[]>([]);
  const [exampleLoading, setExampleLoading] = useState(false);
  
  // Playlist news state
  const [playlistNews, setPlaylistNews] = useState<PlaylistNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Fetch playlist news items
  const fetchPlaylistNews = async () => {
    if (!user) return;
    
    setNewsLoading(true);
    try {
      const { data, error } = await getPlaylistNewsItems(user.id);
      if (error) {
        console.error('Error fetching playlist news:', error);
        return;
      }
      
      // Transform the data and remove filter for audio
      const newsItems: PlaylistNewsItem[] = (data as unknown[])?.map((item) => {
        const newsData = (item as { 
          news: {
            id: string;
            title: string;
            source_url: string;
            summary: string;
            tldr?: string;
            audio_url?: string;
            category: string;
            published_at: string;
            image_url?: string;
          }
        }).news;
        return {
          id: newsData.id,
          title: newsData.title,
          sourceUrl: newsData.source_url,
          summary: newsData.summary,
          tldr: newsData.tldr,
          audioUrl: newsData.audio_url,
          category: newsData.category,
          publishedAt: newsData.published_at,
          imageUrl: newsData.image_url,
        };
      }) || [];
      
      setPlaylistNews(newsItems);
    } catch (error) {
      console.error('Error fetching playlist news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
      fetchPlaylistNews();
    } else {
      setExampleLoading(true);
      (async () => {
        const { data } = await getExampleSummaries();
        setExampleSummaries((data || []).filter(s => s.audioUrl));
        setExampleLoading(false);
      })();
    }
  }, [isAuthenticated, fetchSummaries]);

  // Add effect to refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        fetchSummaries();
        fetchPlaylistNews();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, fetchSummaries]);

  const audioSummaries = summaries.filter(s => s.inPlaylist);
  
  // Handle item selection for summaries
  const handleSummaryClick = (summaryId: string) => {
    if (isListenEditMode) {
      // In edit mode - handle selection
      if (selectedListenItems.includes(summaryId)) {
        setSelectedListenItems(selectedListenItems.filter(id => id !== summaryId));
      } else {
        setSelectedListenItems([...selectedListenItems, summaryId]);
      }
    }
    // Note: We don't expand/collapse summaries on listen page like saved page
  };

  // Handle item selection for news items
  const handleNewsClick = (newsId: string) => {
    if (isListenNewsEditMode) {
      // In edit mode - handle selection
      if (selectedListenNewsItems.includes(newsId)) {
        setSelectedListenNewsItems(selectedListenNewsItems.filter(id => id !== newsId));
      } else {
        setSelectedListenNewsItems([...selectedListenNewsItems, newsId]);
      }
    }
    // Note: We don't expand/collapse news items on listen page
  };

  // Handle select all for current tab
  const handleSelectAll = () => {
    if (activeTab === 'summaries') {
      if (selectedListenItems.length === audioSummaries.length) {
        // If all are selected, deselect all
        setSelectedListenItems([]);
      } else {
        // Otherwise, select all
        setSelectedListenItems(audioSummaries.map(s => s.id));
      }
    } else {
      if (selectedListenNewsItems.length === playlistNews.length) {
        // If all are selected, deselect all
        setSelectedListenNewsItems([]);
      } else {
        // Otherwise, select all
        setSelectedListenNewsItems(playlistNews.map(n => n.id));
      }
    }
  };

  if (!isAuthenticated) {
    if (exampleLoading) {
      return <div>Loading example TLDRs...</div>;
    }

    return (
      <div>
        <div className="space-y-4">
          {exampleSummaries.map((summary) => (
            <Card 
              key={summary.id}
              className="border border-gray-200 dark:border-gray-700"
            >
              <CardContent>
                <h3 className="font-medium text-lg mb-4">
                  {summary.title}
                </h3>
                
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleAudio(summary.id, summary.audioUrl!)}
                      className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                      title={currentlyPlaying === summary.id && isPlaying ? 'Pause' : 'Play'}
                    >
                      {currentlyPlaying === summary.id && isPlaying ? (
                        <Pause size={24} />
                      ) : (
                        <Play size={24} />
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {currentlyPlaying === summary.id && isPlaying ? 'Now Playing' : 'Ready to Play'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Click to {currentlyPlaying === summary.id && isPlaying ? 'pause' : 'play'} audio
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {new Date(summary.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    {summary.isEli5 ? 'ELI5' : `Level ${summary.summaryLevel}`}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (isLoading && newsLoading) {
    return (
      <div>
        <p>Loading audio content...</p>
      </div>
    );
  }
  
  if (audioSummaries.length === 0 && playlistNews.length === 0) {
    return (
      <div>
        <Card>
          <CardContent className="text-center py-8">
            <Headphones size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-4">
              No items in your playlist yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Click the headphones icon on TLDRs and news articles to add them to your listening playlist
            </p>
            <div className="space-y-2">
              <Button 
                variant="primary"
                onClick={() => navigate('/summarize')}
              >
                Create Summary
              </Button>
              <Button 
                variant="secondary"
                onClick={() => navigate('/news')}
              >
                Browse News
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Simple tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('summaries')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'summaries'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText size={16} />
            <span>My TLDRs ({audioSummaries.length})</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'news'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Newspaper size={16} />
            <span>News TLDRs ({playlistNews.length})</span>
          </div>
        </button>
      </div>

      {/* Select All button - only show in edit mode */}
      {(isListenEditMode || isListenNewsEditMode) && (
        <div className="mb-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            {((activeTab === 'summaries' && selectedListenItems.length === audioSummaries.length) ||
              (activeTab === 'news' && selectedListenNewsItems.length === playlistNews.length)) ? (
              <CheckSquare size={20} className="text-blue-500" />
            ) : (
              <Square size={20} />
            )}
            {((activeTab === 'summaries' && selectedListenItems.length === audioSummaries.length) ||
              (activeTab === 'news' && selectedListenNewsItems.length === playlistNews.length)) ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Content based on active tab - SIMPLE MEDIA PLAYER FORMAT */}
      <div className="space-y-4">
        {activeTab === 'summaries' ? (
          audioSummaries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <h3 className="text-lg font-medium mb-4">
                  No TLDRs in your playlist yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Click the headphones icon on your saved TLDRs to add them to your listening playlist
                </p>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/saved')}
                >
                  View Saved TLDRs
                </Button>
              </CardContent>
            </Card>
          ) : (
            audioSummaries.map((summary) => (
              <Card 
                key={summary.id} 
                className={`border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                  isListenEditMode && selectedListenItems.includes(summary.id) 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : ''
                }`}
                onClick={() => handleSummaryClick(summary.id)}
              >
                <CardContent>
                  {isListenEditMode && (
                    <div className="flex items-center mb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSummaryClick(summary.id);
                        }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {selectedListenItems.includes(summary.id) ? (
                          <CheckSquare size={20} className="text-blue-500" />
                        ) : (
                          <Square size={20} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}
                  
                  <h3 className="font-medium text-lg mb-4">
                    {summary.title}
                  </h3>
                  
                  {summary.audioUrl ? (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleAudio(summary.id, summary.audioUrl!)}
                          className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                          title={currentlyPlaying === summary.id && isPlaying ? 'Pause' : 'Play'}
                        >
                          {currentlyPlaying === summary.id && isPlaying ? (
                            <Pause size={24} />
                          ) : (
                            <Play size={24} />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {currentlyPlaying === summary.id && isPlaying ? 'Now Playing' : 'Ready to Play'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Click to {currentlyPlaying === summary.id && isPlaying ? 'pause' : 'play'} audio
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        Audio not generated yet
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/saved')}
                      >
                        Generate Audio on Saved Page
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {new Date(summary.createdAt).toLocaleDateString()}
                    </span>
                    <span>
                      {summary.isEli5 ? 'ELI5' : `Level ${summary.summaryLevel}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )
        ) : (
          playlistNews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Newspaper size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-4">
                  No news TLDRs in your playlist yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Click the headphones icon on news TLDR cards to add them to your playlist
                </p>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/news')}
                >
                  Browse News
                </Button>
              </CardContent>
            </Card>
          ) : (
            playlistNews.map((newsItem) => (
              <Card 
                key={newsItem.id} 
                className={`border border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                  isListenNewsEditMode && selectedListenNewsItems.includes(newsItem.id) 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : ''
                }`}
                onClick={() => handleNewsClick(newsItem.id)}
              >
                <CardContent>
                  {isListenNewsEditMode && (
                    <div className="flex items-center mb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewsClick(newsItem.id);
                        }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {selectedListenNewsItems.includes(newsItem.id) ? (
                          <CheckSquare size={20} className="text-blue-500" />
                        ) : (
                          <Square size={20} className="text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                      {newsItem.category}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(newsItem.publishedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-lg mb-4">
                    {newsItem.title}
                  </h3>
                  
                  {newsItem.audioUrl ? (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleAudio(newsItem.id, newsItem.audioUrl!)}
                          className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                          title={currentlyPlaying === newsItem.id && isPlaying ? 'Pause' : 'Play'}
                        >
                          {currentlyPlaying === newsItem.id && isPlaying ? (
                            <Pause size={24} />
                          ) : (
                            <Play size={24} />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {currentlyPlaying === newsItem.id && isPlaying ? 'Now Playing' : 'Ready to Play'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Click to {currentlyPlaying === newsItem.id && isPlaying ? 'pause' : 'play'} audio
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        Audio not generated yet
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/news')}
                      >
                        Generate Audio on News Page
                      </Button>
                    </div>
                  )}
                  
                  <a
                    href={newsItem.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                  >
                    Read Full Article →
                  </a>
                </CardContent>
              </Card>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default ListenPage;