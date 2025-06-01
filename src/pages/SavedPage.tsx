import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import { useAudioStore } from '../store/audioStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';
import { Volume2, Copy, Check, CheckSquare, Square, ChevronDown, Bookmark, Newspaper, FileText, Headphones } from 'lucide-react';
import { Summary } from '../types';
import { getExampleSummaries, getBookmarkedNewsItems } from '../lib/supabase';
import { useNewsStore } from '../store/newsStore';
import UpgradeModal from '../components/ui/UpgradeModal';
import NoAudioModal from '../components/ui/NoAudioModal';

interface BookmarkedNewsItem {
  id: string;
  title: string;
  sourceUrl: string;
  summary: string;
  tldr?: string;
  audioUrl?: string;
  category: string;
  publishedAt: string;
  imageUrl?: string;
  inPlaylist?: boolean;
}

const SavedPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { 
    summaries, 
    fetchSummaries, 
    isLoading, 
    generateAudioForSummary, 
    selectedSummaries, 
    setSelectedSummaries,
    isEditMode,
    togglePlaylist
  } = useSummaryStore();
  const { generateAudioForNewsItem } = useNewsStore();
  const { 
    selectedSavedNewsItems,
    setSelectedSavedNewsItems,
    isSavedNewsEditMode
  } = useNewsStore();
  const { currentlyPlaying, isPlaying, toggleAudio } = useAudioStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'summaries' | 'news'>('summaries');
  
  // Regular summaries state
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exampleSummaries, setExampleSummaries] = useState<Summary[]>([]);
  const [exampleLoading, setExampleLoading] = useState(false);
  
  // Bookmarked news state
  const [bookmarkedNews, setBookmarkedNews] = useState<BookmarkedNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedNewsItem, setSelectedNewsItem] = useState<string | null>(null);
  const [newsAudioLoading, setNewsAudioLoading] = useState<{ [id: string]: boolean }>({});
  const [newsCopiedId, setNewsCopiedId] = useState<string | null>(null);
  
  // Add new state for modals
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showNoAudioModal, setShowNoAudioModal] = useState(false);
  const [noAudioItemType, setNoAudioItemType] = useState<'TLDR' | 'news'>('TLDR');
  
  // Fetch bookmarked news items
  const fetchBookmarkedNews = async () => {
    if (!user) return;
    
    setNewsLoading(true);
    try {
      const { data, error } = await getBookmarkedNewsItems(user.id);
      if (error) {
        console.error('Error fetching bookmarked news:', error);
        return;
      }
      
      // Transform the data - using type assertion as the data structure from Supabase may vary
      const newsItems: BookmarkedNewsItem[] = (data as unknown[])?.map((item) => {
        const metaData = item as { 
          in_playlist?: boolean;
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
        };
        const newsData = metaData.news;
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
          inPlaylist: metaData.in_playlist || false,
        };
      }) || [];
      
      setBookmarkedNews(newsItems);
    } catch (error) {
      console.error('Error fetching bookmarked news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
      fetchBookmarkedNews();
    } else {
      // Fetch example summaries for unauthenticated users
      setExampleLoading(true);
      (async () => {
        const { data } = await getExampleSummaries();
        setExampleSummaries(data || []);
        setExampleLoading(false);
      })();
    }
  }, [isAuthenticated, fetchSummaries]);
  
  // Listen for custom event to refresh bookmarked news
  useEffect(() => {
    const handleRefreshBookmarkedNews = () => {
      if (isAuthenticated) {
        fetchBookmarkedNews();
      }
    };

    window.addEventListener('refreshBookmarkedNews', handleRefreshBookmarkedNews);
    return () => window.removeEventListener('refreshBookmarkedNews', handleRefreshBookmarkedNews);
  }, [isAuthenticated]);
  
  const handleSummaryClick = (summaryId: string) => {
    if (isEditMode) {
      // In edit mode - handle selection
      if (selectedSummaries.includes(summaryId)) {
        setSelectedSummaries(selectedSummaries.filter(id => id !== summaryId));
      } else {
        setSelectedSummaries([...selectedSummaries, summaryId]);
      }
    } else {
      // Normal mode - expand/collapse summary
      setSelectedSummary(summaryId === selectedSummary ? null : summaryId);
    }
  };

  const handleNewsClick = (newsId: string) => {
    if (isSavedNewsEditMode) {
      // In edit mode - handle selection
      if (selectedSavedNewsItems.includes(newsId)) {
        setSelectedSavedNewsItems(selectedSavedNewsItems.filter(id => id !== newsId));
      } else {
        setSelectedSavedNewsItems([...selectedSavedNewsItems, newsId]);
      }
    } else {
      // Normal mode - expand/collapse news item
      setSelectedNewsItem(newsId === selectedNewsItem ? null : newsId);
    }
  };

  const handleSelectAll = () => {
    if (activeTab === 'summaries') {
      if (selectedSummaries.length === summaries.length) {
        // If all are selected, deselect all
        setSelectedSummaries([]);
      } else {
        // Otherwise, select all
        setSelectedSummaries(summaries.map(s => s.id));
      }
    } else {
      // News tab
      if (selectedSavedNewsItems.length === bookmarkedNews.length) {
        // If all are selected, deselect all
        setSelectedSavedNewsItems([]);
      } else {
        // Otherwise, select all
        setSelectedSavedNewsItems(bookmarkedNews.map(n => n.id));
      }
    }
  };
  
  const handleSpeakerClick = async (summary: Summary, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if user is on free plan
    if (!user?.isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    
    if (summary.audioUrl) {
      // Use global audio store to handle playback
      toggleAudio(summary.id, summary.audioUrl);
    } else {
      // Generate audio
      setAudioLoading(prev => ({ ...prev, [summary.id]: true }));
      try {
        await generateAudioForSummary(summary.id);
        // After generating, the summary store will update and we can try playing
        // We'll need to refetch to get the updated audioUrl
        await fetchSummaries();
      } catch (err: unknown) {
        let message = 'Failed to generate audio.';
        if (err instanceof Error) message = err.message;
        console.log('TTS error:', message);
      } finally {
        setAudioLoading(prev => ({ ...prev, [summary.id]: false }));
      }
    }
  };

  const handleNewsSpeakerClick = async (newsItem: BookmarkedNewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // News TTS is free for all users, so no premium check needed
    
    if (newsItem.audioUrl) {
      // Use global audio store to handle playback
      toggleAudio(newsItem.id, newsItem.audioUrl);
    } else {
      // Generate audio for news item
      setNewsAudioLoading(prev => ({ ...prev, [newsItem.id]: true }));
      try {
        await generateAudioForNewsItem(newsItem.id);
        // Refetch to get updated audio URL
        await fetchBookmarkedNews();
      } catch (err: unknown) {
        let message = 'Failed to generate audio.';
        if (err instanceof Error) message = err.message;
        console.log('TTS error:', message);
      } finally {
        setNewsAudioLoading(prev => ({ ...prev, [newsItem.id]: false }));
      }
    }
  };

  const handlePlaylistToggle = async (summary: Summary) => {
    if (!user) return;
    
    // Check if trying to add to playlist but no audio exists
    if (!summary.inPlaylist && !summary.audioUrl) {
      setNoAudioItemType('TLDR');
      setShowNoAudioModal(true);
      return;
    }
    
    // Proceed with normal playlist toggle
    await togglePlaylist(summary.id);
  };

  const handleNewsPlaylistToggle = async (newsItem: BookmarkedNewsItem) => {
    if (!user) return;
    
    // Check if trying to add to playlist but no audio exists
    if (!newsItem.inPlaylist && !newsItem.audioUrl) {
      setNoAudioItemType('news');
      setShowNoAudioModal(true);
      return;
    }
    
    try {
      // Update in database using the news store's upsert function
      const { upsertUserNewsMeta } = await import('../lib/supabase');
      await upsertUserNewsMeta(user.id, newsItem.id, { 
        bookmarked: true, // Keep it bookmarked
        in_playlist: !newsItem.inPlaylist 
      });
      
      // Update local state
      setBookmarkedNews(prev => 
        prev.map(item => 
          item.id === newsItem.id 
            ? { ...item, inPlaylist: !item.inPlaylist }
            : item
        )
      );
    } catch (error) {
      console.error('Failed to toggle news playlist:', error);
    }
  };
  
  if (!isAuthenticated) {
    if (exampleLoading) {
      return <div>Loading example TLDRs...</div>;
    }

    const handleExampleSpeakerClick = async (summary: Summary, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!summary.audioUrl) return;
      
      // Use global audio store to handle playback
      toggleAudio(summary.id, summary.audioUrl);
    };

    return (
      <div>
        <div className="space-y-4">
          {exampleSummaries.map((summary) => (
            <Card 
              key={summary.id}
              onClick={() => setSelectedSummary(summary.id === selectedSummary ? null : summary.id)}
              className="cursor-pointer hover:border-blue-300 border border-gray-200 dark:border-gray-700 transition-all"
            >
              <CardContent>
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-lg mb-2 line-clamp-1">
                    {summary.title}
                  </h3>
                  <button
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSummary(summary.id === selectedSummary ? null : summary.id);
                    }}
                  >
                    <ChevronDown 
                      size={20} 
                      className={`text-gray-500 dark:text-gray-400 transition-transform ${selectedSummary === summary.id ? 'rotate-180' : ''}`} 
                    />
                  </button>
                </div>

                {selectedSummary === summary.id ? (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="prose prose-blue max-w-none dark:prose-invert">
                      <ReactMarkdown>
                        {summary.summary
                          .split('\n')
                          .filter(line => !/^#+ /.test(line.trim()))
                          .join('\n')}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                    {summary.summary}
                  </p>
                )}

                <div className="flex justify-between items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {new Date(summary.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    {summary.isEli5 ? 'ELI5' : `Level ${summary.summaryLevel}`}
                  </span>
                  <button
                    onClick={(e) => handleExampleSpeakerClick(summary, e)}
                    className={`ml-2 p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-700
                      ${currentlyPlaying === summary.id && isPlaying
                        ? 'bg-green-600'
                        : summary.audioUrl 
                        ? 'bg-green-500' 
                        : 'bg-gray-200 dark:bg-gray-700'
                      }
                    `}
                    title={
                      currentlyPlaying === summary.id && isPlaying
                        ? 'Pause audio'
                        : summary.audioUrl
                        ? 'Play audio'
                        : 'Audio not available'
                    }
                    disabled={!summary.audioUrl}
                  >
                    <Volume2
                      size={20}
                      className={
                        currentlyPlaying === summary.id && isPlaying
                          ? 'text-white animate-pulse'
                          : summary.audioUrl
                          ? 'text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (isLoading && summaries.length === 0 && newsLoading) {
    return (
      <div>
        <p>Loading saved items...</p>
      </div>
    );
  }
  
  if (summaries.length === 0 && bookmarkedNews.length === 0) {
    return (
      <div>
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">
              You don't have any saved items yet
            </h3>
            <div className="space-y-2">
              <Button 
                variant="primary"
                onClick={() => navigate('/summarize')}
              >
                Create Summary
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Or bookmark news TLDRs from the News page
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
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
            <span>My TLDRs ({summaries.length})</span>
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
            <Bookmark size={16} />
            <span>News TLDRs ({bookmarkedNews.length})</span>
          </div>
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'summaries' ? (
        <div>
          {isEditMode && (
            <div className="mb-4 flex items-center">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {selectedSummaries.length === summaries.length ? (
                  <CheckSquare size={20} className="text-blue-500" />
                ) : (
                  <Square size={20} />
                )}
                <span className="text-sm font-medium">
                  {selectedSummaries.length === summaries.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {selectedSummaries.length > 0 && `${selectedSummaries.length} selected`}
              </span>
            </div>
          )}
          
          {summaries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <h3 className="text-lg font-medium mb-4">
                  You don't have any saved TL;DRs yet
                </h3>
                <Button 
                  variant="primary"
                  onClick={() => navigate('/summarize')}
                >
                  Create Summary
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {summaries.map((summary) => (
                <Card 
                  key={summary.id}
                  onClick={() => handleSummaryClick(summary.id)}
                  className={`cursor-pointer hover:border-blue-300 border transition-all ${
                    selectedSummaries.includes(summary.id)
                      ? 'border-blue-500 dark:border-blue-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <CardContent>
                    <div className="flex items-start gap-4">
                      {isEditMode && (
                        <div className={`p-1 rounded-full border ${
                          selectedSummaries.includes(summary.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          <Check size={16} className={selectedSummaries.includes(summary.id) ? 'text-white' : 'text-transparent'} />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-lg mb-2 line-clamp-1">
                          {summary.title}
                        </h3>
                        
                        {selectedSummary === summary.id ? (
                          <div className="relative">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1" />
                              <div className="flex items-center gap-2">
                                <button
                                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                  title={copiedId === summary.id ? 'Copied!' : 'Copy summary'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const textToCopy = summary.summary
                                      .split('\n')
                                      .filter(line => !/^#+ /.test(line.trim()))
                                      .join('\n');
                                    navigator.clipboard.writeText(textToCopy);
                                    setCopiedId(summary.id);
                                    setTimeout(() => setCopiedId(null), 1500);
                                  }}
                                >
                                  <Copy size={20} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaylistToggle(summary);
                                  }}
                                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                    summary.inPlaylist ? 'bg-purple-100 dark:bg-purple-900/20' : ''
                                  }`}
                                  title={summary.inPlaylist ? 'Remove from Listen playlist' : 'Add to Listen playlist'}
                                >
                                  <Headphones size={20} className={summary.inPlaylist ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'} />
                                </button>
                                <button
                                  onClick={(e) => handleSpeakerClick(summary, e)}
                                  className={`p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-700
                                    ${audioLoading[summary.id] 
                                      ? 'animate-pulse bg-green-200' 
                                      : currentlyPlaying === summary.id && isPlaying
                                      ? 'bg-green-600'
                                      : summary.audioUrl 
                                      ? 'bg-green-500' 
                                      : 'bg-gray-200 dark:bg-gray-700'
                                    }
                                  `}
                                  title={
                                    audioLoading[summary.id]
                                      ? 'Generating audio...'
                                      : currentlyPlaying === summary.id && isPlaying
                                      ? 'Pause audio'
                                      : summary.audioUrl
                                      ? 'Play audio'
                                      : 'Generate audio'
                                  }
                                  disabled={audioLoading[summary.id]}
                                >
                                  <Volume2
                                    size={20}
                                    className={
                                      audioLoading[summary.id]
                                        ? 'text-green-700'
                                        : currentlyPlaying === summary.id && isPlaying
                                        ? 'text-white animate-pulse'
                                        : summary.audioUrl
                                        ? 'text-white'
                                        : 'text-gray-500 dark:text-gray-400'
                                    }
                                  />
                                </button>
                              </div>
                            </div>
                            {copiedId === summary.id && (
                              <span className="absolute top-0 right-24 mt-2 px-2 py-1 bg-green-500 text-white text-xs rounded shadow">Copied!</span>
                            )}
                            <div className="prose dark:prose-invert max-w-none">
                              <ReactMarkdown>
                                {summary.summary
                                  .split('\n')
                                  .filter(line => !/^#+ /.test(line.trim()))
                                  .join('\n')}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <p className="text-gray-600 dark:text-gray-400 line-clamp-2 flex-1">
                              {summary.summary}
                            </p>
                            <div className="flex items-center gap-2 ml-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlaylistToggle(summary);
                                }}
                                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                  summary.inPlaylist ? 'bg-purple-100 dark:bg-purple-900/20' : ''
                                }`}
                                title={summary.inPlaylist ? 'Remove from Listen playlist' : 'Add to Listen playlist'}
                              >
                                <Headphones size={20} className={summary.inPlaylist ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'} />
                              </button>
                              <button
                                onClick={(e) => handleSpeakerClick(summary, e)}
                                className={`p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-700
                                  ${audioLoading[summary.id] 
                                    ? 'animate-pulse bg-green-200' 
                                    : currentlyPlaying === summary.id && isPlaying
                                    ? 'bg-green-600'
                                    : summary.audioUrl 
                                    ? 'bg-green-500' 
                                    : 'bg-gray-200 dark:bg-gray-700'
                                  }
                                `}
                                title={
                                  audioLoading[summary.id]
                                    ? 'Generating audio...'
                                    : currentlyPlaying === summary.id && isPlaying
                                    ? 'Pause audio'
                                    : summary.audioUrl
                                    ? 'Play audio'
                                    : 'Generate audio'
                                }
                                disabled={audioLoading[summary.id]}
                              >
                                <Volume2
                                  size={20}
                                  className={
                                    audioLoading[summary.id]
                                      ? 'text-green-700'
                                      : currentlyPlaying === summary.id && isPlaying
                                      ? 'text-white animate-pulse'
                                      : summary.audioUrl
                                      ? 'text-white'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }
                                />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            {new Date(summary.createdAt).toLocaleDateString()}
                          </span>
                          <span>
                            {summary.isEli5 ? 'ELI5' : `Level ${summary.summaryLevel}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Bookmarked News Tab
        <div>
          {isSavedNewsEditMode && (
            <div className="mb-4 flex items-center">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {selectedSavedNewsItems.length === bookmarkedNews.length ? (
                  <CheckSquare size={20} className="text-blue-500" />
                ) : (
                  <Square size={20} />
                )}
                <span className="text-sm font-medium">
                  {selectedSavedNewsItems.length === bookmarkedNews.length ? 'Deselect All' : 'Select All'}
                </span>
              </button>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                {selectedSavedNewsItems.length > 0 && `${selectedSavedNewsItems.length} selected`}
              </span>
            </div>
          )}
          
          {bookmarkedNews.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Newspaper size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-4">
                  No bookmarked news TLDRs yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Bookmark news articles on the News page to see them here
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
            <div className="space-y-4">
              {bookmarkedNews.map((newsItem) => (
                <Card 
                  key={newsItem.id}
                  onClick={() => handleNewsClick(newsItem.id)}
                  className={`cursor-pointer hover:border-blue-300 border border-gray-200 dark:border-gray-700 transition-all ${
                    isSavedNewsEditMode && selectedSavedNewsItems.includes(newsItem.id) 
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : ''
                  }`}
                >
                  <CardContent>
                    {isSavedNewsEditMode && (
                      <div className="flex items-center mb-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNewsClick(newsItem.id);
                          }}
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          {selectedSavedNewsItems.includes(newsItem.id) ? (
                            <CheckSquare size={20} className="text-blue-500" />
                          ) : (
                            <Square size={20} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                    )}
                    
                    {newsItem.imageUrl && (
                      <div className="w-full h-48 overflow-hidden mb-4 rounded-lg">
                        <img 
                          src={newsItem.imageUrl} 
                          alt={newsItem.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
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
                    
                    <h3 className="font-medium text-lg mb-2 line-clamp-1">
                      {newsItem.title}
                    </h3>
                    
                    <div className="flex justify-between items-start">
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
                        {newsItem.summary}
                      </p>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNewsPlaylistToggle(newsItem);
                          }}
                          className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                            newsItem.inPlaylist ? 'bg-purple-100 dark:bg-purple-900/20' : ''
                          }`}
                          title={newsItem.inPlaylist ? 'Remove from Listen playlist' : 'Add to Listen playlist'}
                        >
                          <Headphones size={20} className={newsItem.inPlaylist ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'} />
                        </button>
                        <button
                          onClick={(e) => handleNewsSpeakerClick(newsItem, e)}
                          className={`p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-700
                            ${newsAudioLoading[newsItem.id] 
                              ? 'animate-pulse bg-green-200' 
                              : currentlyPlaying === newsItem.id && isPlaying
                              ? 'bg-green-600'
                              : newsItem.audioUrl 
                              ? 'bg-green-500' 
                              : 'bg-gray-200 dark:bg-gray-700'
                            }
                          `}
                          title={
                            newsAudioLoading[newsItem.id]
                              ? 'Generating audio...'
                              : currentlyPlaying === newsItem.id && isPlaying
                              ? 'Pause audio'
                              : newsItem.audioUrl
                              ? 'Play audio'
                              : 'Generate audio'
                          }
                          disabled={newsAudioLoading[newsItem.id]}
                        >
                          <Volume2
                            size={20}
                            className={
                              newsAudioLoading[newsItem.id]
                                ? 'text-green-700'
                                : currentlyPlaying === newsItem.id && isPlaying
                                ? 'text-white animate-pulse'
                                : newsItem.audioUrl
                                ? 'text-white'
                                : 'text-gray-500 dark:text-gray-400'
                            }
                          />
                        </button>
                      </div>
                    </div>

                    {selectedNewsItem === newsItem.id && newsItem.tldr && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              TLDR Summary
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title={newsCopiedId === newsItem.id ? 'Copied!' : 'Copy TLDR'}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(newsItem.tldr || '');
                                setNewsCopiedId(newsItem.id);
                                setTimeout(() => setNewsCopiedId(null), 1500);
                              }}
                            >
                              <Copy size={18} />
                            </button>
                            {newsCopiedId === newsItem.id && (
                              <span className="absolute top-0 right-24 mt-2 px-2 py-1 bg-green-500 text-white text-xs rounded shadow">Copied!</span>
                            )}
                          </div>
                        </div>
                        <div className="prose prose-blue max-w-none dark:prose-invert">
                          <ReactMarkdown>{newsItem.tldr}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <a
                        href={newsItem.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Read Full Article →
                      </a>
                      {newsItem.tldr && (
                        <button
                          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title={selectedNewsItem === newsItem.id ? 'Hide TLDR' : 'Show TLDR'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNewsClick(newsItem.id);
                          }}
                        >
                          <ChevronDown 
                            size={20} 
                            className={`text-gray-500 dark:text-gray-400 transition-transform ${selectedNewsItem === newsItem.id ? '' : 'rotate-180'}`} 
                          />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

      {/* No Audio Modal */}
      {showNoAudioModal && (
        <NoAudioModal
          isOpen={showNoAudioModal}
          onClose={() => setShowNoAudioModal(false)}
          itemType={noAudioItemType}
        />
      )}
    </div>
  );
};

export default SavedPage;