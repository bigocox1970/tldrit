import React, { useState, useEffect } from 'react';
import { Volume2, Bookmark, BookmarkCheck, FileText, Copy, Headphones, ChevronDown, X } from 'lucide-react';
import { NewsItem as NewsItemType } from '../../types';
import Card, { CardContent } from '../ui/Card';
import { useNewsStore } from '../../store/newsStore';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

interface NewsItemProps {
  item: NewsItemType;
}

const NewsItem: React.FC<NewsItemProps> = ({ item }) => {
  const { generateAudioForNewsItem, tldrLoading, currentlyPlayingId, setCurrentlyPlaying, audioRefs } = useNewsStore();
  const { user } = useAuthStore();
  const localStorageKey = `tldr-open-${item.id}`;
  const [showTLDR, setShowTLDR] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(localStorageKey) === 'true';
    }
    return false;
  });
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [audioLoading, setAudioLoading] = useState<{ [id: string]: boolean }>({});
  
  const handleClick = () => {
    window.open(item.sourceUrl, '_blank');
  };

  const newsItem = useNewsStore(state => state.newsItems.find(i => i.id === item.id)) || item;

  const isTLDRLoading = tldrLoading[item.id] || false;

  const handleSpeakerClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (newsItem.audioUrl) {
      // Initialize audio if not already done
      if (!audioRefs[item.id]) {
        const audio = new Audio(newsItem.audioUrl);
        audio.addEventListener('ended', () => {
          setCurrentlyPlaying(null);
        });
        audio.addEventListener('error', () => {
          console.error('Audio playback error');
          setCurrentlyPlaying(null);
        });
        useNewsStore.setState(state => ({
          audioRefs: { ...state.audioRefs, [item.id]: audio }
        }));
      }

      const audio = audioRefs[item.id];
      if (!audio) return;

      // Toggle play/pause
      if (currentlyPlayingId === item.id) {
        audio.pause();
        setCurrentlyPlaying(null);
      } else {
        try {
          await audio.play();
          setCurrentlyPlaying(item.id);
        } catch (error) {
          console.error('Failed to play audio:', error);
          setCurrentlyPlaying(null);
        }
      }
    } else {
      // Generate audio
      setAudioLoading(prev => ({ ...prev, [item.id]: true }));
      try {
        await generateAudioForNewsItem(item.id);
        // After generating, auto-play if audioUrl is now set
        const updatedNewsItem = useNewsStore.getState().newsItems.find(i => i.id === item.id);
        if (updatedNewsItem?.audioUrl) {
          const audio = new Audio(updatedNewsItem.audioUrl);
          audio.addEventListener('ended', () => {
            setCurrentlyPlaying(null);
          });
          audio.addEventListener('error', () => {
            console.error('Audio playback error');
            setCurrentlyPlaying(null);
          });
          useNewsStore.setState(state => ({
            audioRefs: { ...state.audioRefs, [item.id]: audio }
          }));
          try {
            await audio.play();
            setCurrentlyPlaying(item.id);
          } catch (error) {
            console.error('Failed to play audio:', error);
            setCurrentlyPlaying(null);
          }
        }
      } finally {
        setAudioLoading(prev => ({ ...prev, [item.id]: false }));
      }
    }
  };

  // Map tldr for UI compatibility
  const tldrText = newsItem.tldr;

  useEffect(() => {
    if (showTLDR && !newsItem.tldr && user && !tldrLoading[item.id]) {
      useNewsStore.getState().generateTLDRForNewsItem(item.id);
    }
  }, [showTLDR, newsItem.tldr, user, tldrLoading[item.id], item.id]);

  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      if (audioRefs[item.id]) {
        audioRefs[item.id]?.pause();
        audioRefs[item.id]?.remove();
        useNewsStore.setState(state => {
          const newRefs = { ...state.audioRefs };
          delete newRefs[item.id];
          return { audioRefs: newRefs };
        });
      }
    };
  }, [item.id, audioRefs]);

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

          {/* TLDR Section */}
          {(tldrText || showTLDR) && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    TLDR Summary
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowTLDR((prev) => !prev)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={showTLDR ? 'Hide TLDR' : 'Show TLDR'}
                  >
                    <ChevronDown size={20} className={`text-gray-500 dark:text-gray-400 transition-transform ${showTLDR ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </div>
              
              {showTLDR && (
                <div>
                  <div className="flex items-center mb-2 mt-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSpeakerClick}
                        disabled={audioLoading[item.id]}
                        className={`ml-2 p-2 rounded-full border border-gray-200 dark:border-gray-700 transition-colors
                          ${audioLoading[item.id]
                            ? 'animate-pulse bg-green-200'
                            : currentlyPlayingId === item.id
                            ? 'bg-green-600'
                            : newsItem.audioUrl
                            ? 'bg-green-500'
                            : 'bg-gray-200 dark:bg-gray-700'}
                        `}
                        title={audioLoading[item.id]
                          ? 'Generating audio...'
                          : currentlyPlayingId === item.id
                          ? 'Pause audio'
                          : newsItem.audioUrl
                          ? 'Play audio'
                          : 'Generate audio'}
                      >
                        <Volume2
                          size={20}
                          className={audioLoading[item.id]
                            ? 'text-green-700'
                            : currentlyPlayingId === item.id
                            ? 'text-white animate-pulse'
                            : newsItem.audioUrl
                            ? 'text-white'
                            : 'text-gray-500 dark:text-gray-400'}
                        />
                      </button>
                      <button
                        onClick={() => useNewsStore.getState().toggleBookmark(item.id)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={item.bookmarked ? 'Remove bookmark' : 'Bookmark this TLDR'}
                      >
                        {item.bookmarked ? (
                          <BookmarkCheck size={20} className="text-green-500" />
                        ) : (
                          <Bookmark size={20} className="text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => useNewsStore.getState().togglePlaylist(item.id)}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${item.inPlaylist ? 'bg-purple-100 dark:bg-purple-900/20' : ''}`}
                        title={item.inPlaylist ? 'Remove from Listen playlist' : 'Add to Listen playlist'}
                      >
                        <Headphones size={20} className={item.inPlaylist ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'} />
                      </button>
                    </div>
                    <div className="flex-1" />
                    <button
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title={copied ? 'Copied!' : 'Copy TLDR'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (tldrText) {
                          navigator.clipboard.writeText(tldrText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1500);
                        }
                      }}
                    >
                      <Copy size={18} />
                    </button>
                    {copied && (
                      <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded shadow">Copied!</span>
                    )}
                  </div>
                  <div className="prose prose-blue max-w-none dark:prose-invert">
                    {isTLDRLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Generating TLDR summary...</span>
                      </div>
                    ) : tldrText ? (
                      <ReactMarkdown>{tldrText}</ReactMarkdown>
                    ) : (
                      <p className="italic">
                        Click the TLDR button to generate a summary
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!user) {
                    setShowLoginDialog(true);
                    return;
                  }
                  if (!showTLDR) setShowTLDR(true);
                  if (!tldrText && user && !tldrLoading[item.id]) {
                    useNewsStore.getState().generateTLDRForNewsItem(item.id);
                  }
                }}
                disabled={tldrLoading[item.id]}
                className={`flex items-center space-x-1 px-3 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${tldrLoading[item.id] ? 'opacity-50' : ''}`}
              >
                {tldrLoading[item.id] ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                  <FileText 
                    size={20} 
                    className={tldrText ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'} 
                  />
                )}
                <span className={`text-sm font-medium ${tldrText ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  TLDR
                </span>
              </button>
            </div>

            <button
              onClick={handleClick}
              className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition-colors"
            >
              Read Full Article →
            </button>
          </div>

          {/* Login Dialog */}
          {showLoginDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Sign in Required</h3>
                  <button
                    onClick={() => setShowLoginDialog(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Please sign in or create a FREE account to access the TLDR feature.
                </p>
                <div className="flex space-x-4">
                  <Link to="/login" className="flex-1">
                    <Button variant="primary" fullWidth onClick={() => setShowLoginDialog(false)}>
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register" className="flex-1">
                    <Button variant="outline" fullWidth onClick={() => setShowLoginDialog(false)}>
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsItem;
