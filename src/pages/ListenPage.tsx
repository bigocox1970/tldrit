import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import { useAudioStore } from '../store/audioStore';
import { useNewsStore } from '../store/newsStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StickyMediaPlayer from '../components/StickyMediaPlayer';
import DraggablePlaylistItem from '../components/DraggablePlaylistItem';
import { getExampleSummaries, getPlaylistNewsItems } from '../lib/supabase';
import { Summary } from '../types';
import { Headphones, CheckSquare, Square, Play } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

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

interface PlaylistItem {
  id: string;
  title: string;
  audioUrl?: string;
  type: 'summary' | 'news';
  category?: string;
  createdAt?: string;
  publishedAt?: string;
  isEli5?: boolean;
  summaryLevel?: number;
  sourceUrl?: string;
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
  const { currentlyPlaying, toggleAudio, setOnTrackEnd } = useAudioStore();
  const { 
    selectedListenNewsItems,
    setSelectedListenNewsItems,
    isListenNewsEditMode
  } = useNewsStore();
  
  // Regular summaries state
  const [exampleSummaries, setExampleSummaries] = useState<Summary[]>([]);
  const [exampleLoading, setExampleLoading] = useState(false);
  
  // Playlist news state
  const [playlistNews, setPlaylistNews] = useState<PlaylistNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Playlist order state
  const [playlistOrder, setPlaylistOrder] = useState<string[]>([]);

  // Play all mode state
  const [isPlayAllMode, setIsPlayAllMode] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch playlist news items
  const fetchPlaylistNews = async () => {
    if (!user) return;
    
    console.log('[Listen Page] fetchPlaylistNews starting...');
    setNewsLoading(true);
    try {
      const { data, error } = await getPlaylistNewsItems(user.id);
      console.log('[Listen Page] getPlaylistNewsItems result:', { data, error });
      
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
      
      console.log('[Listen Page] fetchPlaylistNews transformed newsItems:', newsItems.length, 'items');
      console.log('[Listen Page] fetchPlaylistNews newsItems IDs:', newsItems.map(item => item.id));
      
      setPlaylistNews(newsItems);
    } catch (error) {
      console.error('Error fetching playlist news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  // Combined refresh function for both summaries and playlist news
  const refreshAllData = async () => {
    if (isAuthenticated) {
      console.log('[Listen Page] refreshAllData called');
      await Promise.all([
        fetchSummaries(),
        fetchPlaylistNews()
      ]);
      console.log('[Listen Page] refreshAllData completed');
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

  // Add effect to refresh data when selection states change (after deletes)
  useEffect(() => {
    const hasNoSelections = selectedListenItems.length === 0 && selectedListenNewsItems.length === 0;
    const isNotInEditMode = !isListenEditMode && !isListenNewsEditMode;
    
    // If we just exited edit mode (no selections and not in edit mode), refresh data
    if (hasNoSelections && isNotInEditMode && isAuthenticated) {
      // Add a small delay to ensure store operations have completed
      const timeoutId = setTimeout(() => {
        refreshAllData();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedListenItems.length, selectedListenNewsItems.length, isListenEditMode, isListenNewsEditMode, isAuthenticated]);

  // Also refresh when page becomes visible after potential changes
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        refreshAllData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  // Create unified playlist
  const unifiedPlaylist = useMemo(() => {
    const audioSummaries = summaries.filter(s => s.inPlaylist);
    
    const summaryItems: PlaylistItem[] = audioSummaries.map(summary => ({
      id: summary.id,
      title: summary.title,
      audioUrl: summary.audioUrl,
      type: 'summary' as const,
      createdAt: summary.createdAt,
      isEli5: summary.isEli5,
      summaryLevel: summary.summaryLevel,
    }));

    const newsItems: PlaylistItem[] = playlistNews.map(news => ({
      id: news.id,
      title: news.title,
      audioUrl: news.audioUrl,
      type: 'news' as const,
      category: news.category,
      publishedAt: news.publishedAt,
      sourceUrl: news.sourceUrl,
    }));

    const allItems = [...summaryItems, ...newsItems];
    
    // Apply saved order if available, otherwise use default order
    if (playlistOrder.length > 0) {
      const orderedItems = playlistOrder
        .map(id => allItems.find(item => item.id === id))
        .filter(Boolean) as PlaylistItem[];
      
      // Add any new items that aren't in the saved order
      const newItems = allItems.filter(item => !playlistOrder.includes(item.id));
      return [...orderedItems, ...newItems];
    }
    
    return allItems;
  }, [summaries, playlistNews, playlistOrder]);

  // Update playlist order when items change
  useEffect(() => {
    if (playlistOrder.length === 0 && unifiedPlaylist.length > 0) {
      setPlaylistOrder(unifiedPlaylist.map(item => item.id));
    }
  }, [unifiedPlaylist, playlistOrder.length]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = unifiedPlaylist.findIndex(item => item.id === active.id);
      const newIndex = unifiedPlaylist.findIndex(item => item.id === over?.id);
      
      const newOrder = arrayMove(unifiedPlaylist, oldIndex, newIndex);
      setPlaylistOrder(newOrder.map(item => item.id));
    }
  };

  // Get current playing index
  const currentIndex = useMemo(() => {
    return unifiedPlaylist.findIndex(item => item.id === currentlyPlaying);
  }, [unifiedPlaylist, currentlyPlaying]);

  // Handle next/previous
  const handleNext = () => {
    if (currentIndex < unifiedPlaylist.length - 1) {
      const nextItem = unifiedPlaylist[currentIndex + 1];
      if (nextItem.audioUrl) {
        toggleAudio(nextItem.id, nextItem.audioUrl);
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevItem = unifiedPlaylist[currentIndex - 1];
      if (prevItem.audioUrl) {
        toggleAudio(prevItem.id, prevItem.audioUrl);
      }
    }
  };

  // Handle play all - starts from first item with audio or from currently selected item
  const handlePlayAll = () => {
    const itemsWithAudio = unifiedPlaylist.filter(item => item.audioUrl);
    if (itemsWithAudio.length === 0) return;

    // If already in play all mode, turn it off and stop audio
    if (isPlayAllMode) {
      setIsPlayAllMode(false);
      setOnTrackEnd(null);
      // Stop the currently playing audio
      if (currentlyPlaying) {
        // Toggle the current audio to stop it
        const currentItem = unifiedPlaylist.find(item => item.id === currentlyPlaying);
        if (currentItem?.audioUrl) {
          toggleAudio(currentItem.id, currentItem.audioUrl);
        }
      }
      return;
    }

    setIsPlayAllMode(true);

    // If something is already playing, continue from there
    if (currentlyPlaying && currentIndex >= 0) {
      const currentItem = unifiedPlaylist[currentIndex];
      if (currentItem?.audioUrl) {
        toggleAudio(currentItem.id, currentItem.audioUrl);
        return;
      }
    }

    // Otherwise start from the first item with audio
    const firstItemWithAudio = itemsWithAudio[0];
    toggleAudio(firstItemWithAudio.id, firstItemWithAudio.audioUrl!);
  };

  // Handle jumping to a specific track (when not in edit mode)
  const handleTrackJump = (itemId: string) => {
    const item = unifiedPlaylist.find(i => i.id === itemId);
    if (!item?.audioUrl) return;

    // If we're in play all mode, continue from this track
    // If not in play all mode, just play this single track
    toggleAudio(item.id, item.audioUrl);
    
    // Keep play all mode active if it was already active
    // This ensures auto-advance continues from the new position
  };

  // Set up auto-advance when track ends
  useEffect(() => {
    if (isPlayAllMode) {
      setOnTrackEnd(() => {
        // Auto-advance to next track with audio
        if (currentIndex < unifiedPlaylist.length - 1) {
          let nextIndex = currentIndex + 1;
          while (nextIndex < unifiedPlaylist.length) {
            const nextItem = unifiedPlaylist[nextIndex];
            if (nextItem.audioUrl) {
              toggleAudio(nextItem.id, nextItem.audioUrl);
              return;
            }
            nextIndex++;
          }
        }
        // If no next track found, exit play all mode
        setIsPlayAllMode(false);
        setOnTrackEnd(null);
      });
    } else {
      setOnTrackEnd(null);
    }

    return () => {
      setOnTrackEnd(null);
    };
  }, [currentIndex, unifiedPlaylist, toggleAudio, setOnTrackEnd, isPlayAllMode]);

  // Clear play all mode when audio is manually stopped/paused
  useEffect(() => {
    if (!currentlyPlaying) {
      setIsPlayAllMode(false);
    }
  }, [currentlyPlaying]);

  // Handle item selection
  const handleItemSelect = (itemId: string) => {
    const item = unifiedPlaylist.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'summary') {
      if (selectedListenItems.includes(itemId)) {
        setSelectedListenItems(selectedListenItems.filter(id => id !== itemId));
      } else {
        setSelectedListenItems([...selectedListenItems, itemId]);
      }
    } else {
      if (selectedListenNewsItems.includes(itemId)) {
        setSelectedListenNewsItems(selectedListenNewsItems.filter(id => id !== itemId));
      } else {
        setSelectedListenNewsItems([...selectedListenNewsItems, itemId]);
      }
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    const summaryIds = unifiedPlaylist.filter(item => item.type === 'summary').map(item => item.id);
    const newsIds = unifiedPlaylist.filter(item => item.type === 'news').map(item => item.id);
    
    const allSummariesSelected = summaryIds.every(id => selectedListenItems.includes(id));
    const allNewsSelected = newsIds.every(id => selectedListenNewsItems.includes(id));
    
    if (allSummariesSelected && allNewsSelected) {
      // Deselect all
      setSelectedListenItems([]);
      setSelectedListenNewsItems([]);
    } else {
      // Select all
      setSelectedListenItems(summaryIds);
      setSelectedListenNewsItems(newsIds);
    }
  };

  // Check if all items are selected
  const allItemsSelected = useMemo(() => {
    const summaryIds = unifiedPlaylist.filter(item => item.type === 'summary').map(item => item.id);
    const newsIds = unifiedPlaylist.filter(item => item.type === 'news').map(item => item.id);
    
    return summaryIds.every(id => selectedListenItems.includes(id)) &&
           newsIds.every(id => selectedListenNewsItems.includes(id)) &&
           summaryIds.length > 0 && newsIds.length > 0;
  }, [unifiedPlaylist, selectedListenItems, selectedListenNewsItems]);

  if (!isAuthenticated) {
    if (exampleLoading) {
      return <div className="pb-32 md:pb-20">Loading example TLDRs...</div>;
    }

    return (
      <div className="pb-32 md:pb-20">
        <div className="space-y-3">
          {exampleSummaries.map((summary) => (
            <DraggablePlaylistItem
              key={summary.id}
              item={{
                id: summary.id,
                title: summary.title,
                audioUrl: summary.audioUrl,
                type: 'summary',
                createdAt: summary.createdAt,
                isEli5: summary.isEli5,
                summaryLevel: summary.summaryLevel,
              }}
              isSelected={false}
              isEditMode={false}
              onSelect={() => {}}
            />
          ))}
        </div>
      </div>
    );
  }
  
  if (isLoading && newsLoading) {
    return (
      <div className="pb-32 md:pb-20">
        <p>Loading audio content...</p>
      </div>
    );
  }
  
  if (unifiedPlaylist.length === 0) {
    return (
      <div className="pb-32 md:pb-20">
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
    <div className="pb-32 md:pb-20">
      {/* Header with item count */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Your Playlist
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {unifiedPlaylist.length} items
          </p>
        </div>
        
        {/* Play All Button */}
        {unifiedPlaylist.filter(item => item.audioUrl).length > 0 && (
          <Button
            variant={isPlayAllMode ? "secondary" : "primary"}
            onClick={handlePlayAll}
            className={`flex items-center gap-2 ${
              isPlayAllMode 
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white ring-2 ring-orange-200' 
                : ''
            }`}
          >
            <Play size={16} />
            {isPlayAllMode ? 'Playing All' : 'Play All'}
          </Button>
        )}
      </div>

      {/* Select All button - only show in edit mode */}
      {(isListenEditMode || isListenNewsEditMode) && (
        <div className="mb-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            {allItemsSelected ? (
              <CheckSquare size={20} className="text-blue-500" />
            ) : (
              <Square size={20} />
            )}
            {allItemsSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Unified Playlist with Drag and Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={unifiedPlaylist.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {unifiedPlaylist.map((item) => {
              const isSelected = item.type === 'summary' 
                ? selectedListenItems.includes(item.id)
                : selectedListenNewsItems.includes(item.id);
              
              const isEditMode = item.type === 'summary' 
                ? isListenEditMode 
                : isListenNewsEditMode;

              return (
                <DraggablePlaylistItem
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  isEditMode={isEditMode}
                  onSelect={handleItemSelect}
                  onTrackJump={handleTrackJump}
                  onNavigateToSource={() => {
                    if (item.type === 'summary') {
                      navigate('/saved');
                    } else {
                      navigate('/news');
                    }
                  }}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Sticky Media Player */}
      <StickyMediaPlayer
        playlist={unifiedPlaylist}
        currentIndex={currentIndex}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />
    </div>
  );
};

export default ListenPage;