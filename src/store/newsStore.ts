import { create } from 'zustand';
import { NewsItem, UserInterest } from '../types';
import { getAvailableInterests, saveUserInterests, getUserNewsMeta, upsertUserNewsMeta, getNewsByUrlHash, upsertNewsByUrlHash } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { generateAudio, summarizeUrl } from '../lib/ai';
import { urlToHash } from '../lib/hash';

interface TLDROptions {
  summaryLevel: number;
  isEli5: boolean;
  eli5Level?: number;
}

interface UserNewsMeta {
  news_id: string;
  bookmarked: boolean;
  in_playlist: boolean;
}

interface NewsState {
  newsItems: NewsItem[];
  interests: UserInterest[];
  selectedInterests: string[];
  isLoading: boolean;
  error: string | null;
  isFetching: boolean;
  tldrLoading: { [newsItemId: string]: boolean };
  currentlyPlayingId: string | null;
  audioRefs: { [id: string]: HTMLAudioElement | null };
  // Listen page specific selection state
  selectedListenNewsItems: string[];
  setSelectedListenNewsItems: (itemIds: string[]) => void;
  isListenNewsEditMode: boolean;
  setListenNewsEditMode: (isEdit: boolean) => void;
  removeNewsFromPlaylist: (itemIds: string[]) => Promise<void>;
  // Saved page specific selection state
  selectedSavedNewsItems: string[];
  setSelectedSavedNewsItems: (itemIds: string[]) => void;
  isSavedNewsEditMode: boolean;
  setSavedNewsEditMode: (isEdit: boolean) => void;
  deleteSelectedNewsItems: (itemIds: string[]) => Promise<void>;
  setCurrentlyPlaying: (newsItemId: string | null) => void;
  stopAllAudio: () => void;
  fetchNewsItems: () => Promise<void>;
  fetchAvailableInterests: () => Promise<void>;
  updateUserInterests: (interests: string[]) => Promise<void>;
  generateAudioForNewsItem: (newsItemId: string) => Promise<void>;
  generateTLDRForNewsItem: (newsItemId: string, options?: TLDROptions) => Promise<void>;
  refreshNews: () => Promise<void>;
  toggleBookmark: (newsItemId: string) => void;
  togglePlaylist: (newsItemId: string) => void;
}

export const useNewsStore = create<NewsState>((set, get) => ({
  newsItems: [],
  interests: [],
  selectedInterests: [],
  isLoading: false,
  error: null,
  isFetching: false,
  tldrLoading: {},
  currentlyPlayingId: null,
  audioRefs: {},
  selectedListenNewsItems: [],
  setSelectedListenNewsItems: (itemIds: string[]) => {
    set({ selectedListenNewsItems: itemIds });
  },
  isListenNewsEditMode: false,
  setListenNewsEditMode: (isEdit: boolean) => {
    set({ isListenNewsEditMode: isEdit });
  },
  // Saved page specific state
  selectedSavedNewsItems: [],
  setSelectedSavedNewsItems: (itemIds: string[]) => {
    set({ selectedSavedNewsItems: itemIds });
  },
  isSavedNewsEditMode: false,
  setSavedNewsEditMode: (isEdit: boolean) => {
    set({ isSavedNewsEditMode: isEdit, selectedSavedNewsItems: isEdit ? [] : [] });
  },
  deleteSelectedNewsItems: async (itemIds: string[]) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    console.log('[News Store] deleteSelectedNewsItems called with:', itemIds);
    
    set({ isLoading: true, error: null });
    try {
      // For saved page items, we need to work directly with database IDs
      // When deleting from saved, also remove from playlist since listen page should only show saved items
      await Promise.all(itemIds.map(async (id) => {
        console.log('[News Store] Setting bookmarked=false and in_playlist=false for database ID:', id);
        return upsertUserNewsMeta(user.id, id, { bookmarked: false, in_playlist: false });
      }));
      
      console.log('[News Store] deleteSelectedNewsItems completed successfully');
      
      // Clear selection and exit edit mode
      set({ 
        selectedSavedNewsItems: [], 
        isSavedNewsEditMode: false,
        isLoading: false 
      });
    } catch (error) {
      console.error('[News Store] deleteSelectedNewsItems error:', error);
      set({ 
        error: 'Failed to delete news items', 
        isLoading: false 
      });
    }
  },
  removeNewsFromPlaylist: async (itemIds: string[]) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    console.log('[News Store] removeNewsFromPlaylist called with:', itemIds);

    set({ isLoading: true, error: null });
    try {
      // For playlist items, we need to work directly with database IDs
      // Instead of using togglePlaylist, directly update the user_news_meta table
      await Promise.all(itemIds.map(async (id) => {
        console.log('[News Store] Setting inPlaylist=false for database ID:', id);
        return upsertUserNewsMeta(user.id, id, { in_playlist: false });
      }));
      
      console.log('[News Store] removeNewsFromPlaylist completed successfully');
      
      // Clear selection and exit edit mode
      set({ 
        selectedListenNewsItems: [], 
        isListenNewsEditMode: false,
        isLoading: false 
      });
    } catch (error) {
      console.error('[News Store] removeNewsFromPlaylist error:', error);
      set({ 
        error: 'Failed to remove news items from playlist', 
        isLoading: false 
      });
    }
  },
  setCurrentlyPlaying: (newsItemId: string | null) => {
    const state = get();
    // Stop currently playing audio if any
    if (state.currentlyPlayingId && state.currentlyPlayingId !== newsItemId) {
      const audio = state.audioRefs[state.currentlyPlayingId];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
    set({ currentlyPlayingId: newsItemId });
  },
  stopAllAudio: () => {
    const state = get();
    Object.values(state.audioRefs).forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    set({ currentlyPlayingId: null });
  },
  
  fetchNewsItems: async () => {
    const state = get();
    
    // Prevent duplicate fetches (React Strict Mode issue)
    if (state.isFetching) {
      console.log('Already fetching news, skipping duplicate request');
      return;
    }
    
    set({ isLoading: true, error: null, isFetching: true });
    
    const user = useAuthStore.getState().user;
    
    try {
      let categories: string[];
      
      if (user && user.interests.length > 0) {
        // Use user's selected interests
        categories = user.interests;
      } else {
        // Use default categories for non-authenticated users or users without interests
        categories = ['technology', 'world', 'business', 'science', 'crypto', 'ai'];
      }
      
      console.log('Fetching news for categories:', categories);
      
      let newsItems: NewsItem[] = [];
      
      // Try Netlify function first (for production), fallback to direct RSS parsing (for local dev)
      try {
        const response = await fetch('/.netlify/functions/fetch-news', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ categories }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            newsItems = data.newsItems || [];
          } else {
            throw new Error(data.error || 'Failed to fetch news');
          }
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.log('Netlify function not available, using direct RSS parsing for local development:', error);
        
        // Fallback to direct RSS parsing for local development
        const { fetchNewsForCategories } = await import('../lib/rss');
        newsItems = await fetchNewsForCategories(categories);
      }

      // Fetch stored news items to get audio URLs and database IDs
      const storedNewsPromises = newsItems.map(async (item) => {
        const urlHash = urlToHash(item.sourceUrl);
        const { data: storedNews } = await getNewsByUrlHash(urlHash);
        if (storedNews) {
          // Store the database ID for bookmark operations
          item.dbId = storedNews.id;
          if (storedNews.audio_url) {
            item.audioUrl = storedNews.audio_url;
          }
          if (storedNews.tldr) {
            item.tldr = storedNews.tldr;
          }
        }
        return item;
      });

      // Wait for all stored news fetches to complete
      newsItems = await Promise.all(storedNewsPromises);
      
      set({ 
        newsItems, 
        isLoading: false, 
        error: null,
        isFetching: false
      });
      
      // Merge per-user meta
      if (user) {
        const { data: meta } = await getUserNewsMeta(user.id);
        if (meta) {
          set(state => ({
            newsItems: state.newsItems.map(item => {
              // Only check for meta if item has a database ID
              if (item.dbId) {
                const metaItem = meta.find((m: UserNewsMeta) => m.news_id === item.dbId);
                return metaItem ? { ...item, bookmarked: metaItem.bookmarked, inPlaylist: metaItem.in_playlist } : item;
              }
              return item;
            })
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching news items:', err);
      set({ 
        error: 'Failed to fetch news', 
        isLoading: false,
        isFetching: false
      });
    }
  },
  
  fetchAvailableInterests: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await getAvailableInterests();
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      const formattedInterests: UserInterest[] = data?.map(item => ({
        id: item.id,
        name: item.name,
      })) || [];
      
      const user = useAuthStore.getState().user;
      const selectedInterests = user?.interests || [];
      
      set({ 
        interests: formattedInterests,
        selectedInterests, 
        isLoading: false, 
        error: null 
      });
    } catch {
      set({ 
        error: 'Failed to fetch interests', 
        isLoading: false 
      });
    }
  },
  
  updateUserInterests: async (interests: string[]) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true, error: null });
    try {
      const { error } = await saveUserInterests(user.id, interests);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      set({ 
        selectedInterests: interests, 
        isLoading: false, 
        error: null 
      });
      
      await get().refreshNews();
    } catch {
      set({ 
        error: 'Failed to update interests', 
        isLoading: false 
      });
    }
  },
  
  generateAudioForNewsItem: async (newsItemId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const newsItem = get().newsItems.find(item => item.id === newsItemId);
    if (!newsItem) return;

    const urlHash = urlToHash(newsItem.sourceUrl);
    set({ isLoading: true, error: null });

    try {
      const audioText = newsItem.tldr || newsItem.summary;
      const audioUrl = await generateAudio(
        audioText, 
        user.isPremium, 
        'news', 
        newsItem.title,
        newsItem.sourceUrl
      );
      // Minimal required fields for audio upsert
      const audioUpsertPayload = {
        url_hash: urlHash,
        source_url: newsItem.sourceUrl,
        title: newsItem.title,
        summary: newsItem.summary,
        category: newsItem.category,
        audio_url: audioUrl,
        published_at: newsItem.publishedAt,
        image_url: newsItem.imageUrl // Save the image URL when generating audio
      };
      console.log('Upserting audio to Supabase:', audioUpsertPayload);
      await upsertNewsByUrlHash(audioUpsertPayload);
      set(state => ({
        newsItems: state.newsItems.map(item => 
          item.id === newsItemId 
            ? { ...item, audioUrl } 
            : item
        ),
        isLoading: false,
        error: null,
      }));
    } catch {
      set({ 
        error: 'Failed to generate audio', 
        isLoading: false 
      });
    }
  },

  generateTLDRForNewsItem: async (newsItemId: string, options?: TLDROptions) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ error: 'Please log in to generate TLDR summaries' });
      return;
    }
    
    const newsItem = get().newsItems.find(item => item.id === newsItemId);
    if (!newsItem) return;
    const urlHash = urlToHash(newsItem.sourceUrl);

    console.log('[TLDR] Checking Supabase for TLDR:', { urlHash, sourceUrl: newsItem.sourceUrl });
    // Always check Supabase for latest TLDR before generating
    const { data: dbNews, error: dbError } = await getNewsByUrlHash(urlHash);
    console.log('[TLDR] Supabase fetch result:', { dbNews, dbError });
    if (dbError) {
      set({ error: 'Failed to check TLDR in database' });
      return;
    }
    if (dbNews && dbNews.tldr) {
      console.log('[TLDR] Found TLDR in Supabase:', dbNews.tldr);
      // Update local store and return
      set(state => ({
        newsItems: state.newsItems.map(item =>
          item.id === newsItemId ? { ...item, tldr: dbNews.tldr } : item
        ),
        tldrLoading: { ...state.tldrLoading, [newsItemId]: false },
        error: null,
      }));
      return;
    }
    
    // Set loading state for this specific item
    set(state => ({
      tldrLoading: { ...state.tldrLoading, [newsItemId]: true },
      error: null
    }));
    
    try {
      console.log('[TLDR] Generating TLDR with LLM for:', newsItem.sourceUrl);
      // Use the existing summarizeUrl function from ai.ts with options
      const tldrSummary = await summarizeUrl(newsItem.sourceUrl, user.isPremium, options);
      console.log('[TLDR] LLM returned:', tldrSummary);
      // Minimal required fields for TLDR upsert
      const tldrUpsertPayload = {
        url_hash: urlHash,
        source_url: newsItem.sourceUrl,
        title: newsItem.title,
        summary: newsItem.summary,
        tldr: tldrSummary,
        category: newsItem.category,
        published_at: newsItem.publishedAt,
        image_url: newsItem.imageUrl // Save the image URL when generating TLDR
      };
      console.log('Upserting TLDR to Supabase:', tldrUpsertPayload);
      const upsertResult = await upsertNewsByUrlHash(tldrUpsertPayload);
      set(state => ({
        newsItems: state.newsItems.map(item => 
          item.id === newsItemId 
            ? { ...item, tldr: tldrSummary, inPlaylist: true } 
            : item
        ),
        tldrLoading: { ...state.tldrLoading, [newsItemId]: false },
        error: null,
      }));
      // Add to playlist for this user
      if (upsertResult && upsertResult.data && upsertResult.data.id) {
        await upsertUserNewsMeta(user.id, upsertResult.data.id, { in_playlist: true });
      }
      console.log('[TLDR] Updated local state and playlist');
    } catch (error) {
      console.error('[TLDR] Error generating TLDR:', error);
      set(state => ({
        tldrLoading: { ...state.tldrLoading, [newsItemId]: false },
        error: 'Failed to generate TLDR summary'
      }));
    }
  },
  
  refreshNews: async () => {
    // Simply call fetchNewsItems to refresh using Netlify function
    await get().fetchNewsItems();
  },

  toggleBookmark: async (newsItemId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    // Update UI immediately
    set(state => ({
      newsItems: state.newsItems.map(item =>
        item.id === newsItemId
          ? { ...item, bookmarked: !item.bookmarked }
          : item
      )
    }));
    
    const item = get().newsItems.find(item => item.id === newsItemId);
    if (!item) return;
    
    let dbId = item.dbId;
    
    // If no database ID exists, create the news record first
    if (!dbId) {
      const urlHash = urlToHash(item.sourceUrl);
      const newsUpsertPayload = {
        url_hash: urlHash,
        source_url: item.sourceUrl,
        title: item.title,
        summary: item.summary,
        category: item.category,
        published_at: item.publishedAt,
        image_url: item.imageUrl // Save the image URL when bookmarking
      };
      
      try {
        const { data: upsertResult } = await upsertNewsByUrlHash(newsUpsertPayload);
        if (upsertResult) {
          dbId = upsertResult.id;
          // Update the news item with the database ID
          set(state => ({
            newsItems: state.newsItems.map(newsItem =>
              newsItem.id === newsItemId
                ? { ...newsItem, dbId }
                : newsItem
            )
          }));
        }
      } catch (error) {
        console.error('Error creating news record for bookmark:', error);
        // Revert UI change if database operation fails
        set(state => ({
          newsItems: state.newsItems.map(newsItem =>
            newsItem.id === newsItemId
              ? { ...newsItem, bookmarked: !newsItem.bookmarked }
              : newsItem
          )
        }));
        return;
      }
    }
    
    // Now save the bookmark with the database ID
    if (dbId) {
      try {
        const updatedItem = get().newsItems.find(newsItem => newsItem.id === newsItemId);
        await upsertUserNewsMeta(user.id, dbId, { bookmarked: updatedItem?.bookmarked });
      } catch (error) {
        console.error('Error saving bookmark:', error);
        // Revert UI change if database operation fails
        set(state => ({
          newsItems: state.newsItems.map(newsItem =>
            newsItem.id === newsItemId
              ? { ...newsItem, bookmarked: !newsItem.bookmarked }
              : newsItem
          )
        }));
      }
    }
  },

  togglePlaylist: async (newsItemId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    console.log('[News Store] togglePlaylist called for newsItemId:', newsItemId);
    
    // Update UI immediately
    set(state => ({
      newsItems: state.newsItems.map(item =>
        item.id === newsItemId
          ? { ...item, inPlaylist: !item.inPlaylist }
          : item
      )
    }));
    
    const item = get().newsItems.find(item => item.id === newsItemId);
    if (!item) {
      console.log('[News Store] togglePlaylist: item NOT FOUND in newsItems for ID:', newsItemId);
      console.log('[News Store] togglePlaylist: available newsItems IDs:', get().newsItems.map(i => i.id));
      return;
    }
    
    console.log('[News Store] togglePlaylist: found item:', { 
      id: item.id, 
      dbId: item.dbId, 
      currentInPlaylist: item.inPlaylist,
      willBeInPlaylist: !item.inPlaylist 
    });
    
    let dbId = item.dbId;
    
    // If no database ID exists, create the news record first
    if (!dbId) {
      const urlHash = urlToHash(item.sourceUrl);
      const newsUpsertPayload = {
        url_hash: urlHash,
        source_url: item.sourceUrl,
        title: item.title,
        summary: item.summary,
        category: item.category,
        published_at: item.publishedAt,
        image_url: item.imageUrl // Save the image URL when adding to playlist
      };
      
      try {
        const { data: upsertResult } = await upsertNewsByUrlHash(newsUpsertPayload);
        if (upsertResult) {
          dbId = upsertResult.id;
          // Update the news item with the database ID
          set(state => ({
            newsItems: state.newsItems.map(newsItem =>
              newsItem.id === newsItemId
                ? { ...newsItem, dbId }
                : newsItem
            )
          }));
        }
      } catch (error) {
        console.error('Error creating news record for playlist:', error);
        // Revert UI change if database operation fails
        set(state => ({
          newsItems: state.newsItems.map(newsItem =>
            newsItem.id === newsItemId
              ? { ...newsItem, inPlaylist: !newsItem.inPlaylist }
              : newsItem
          )
        }));
        return;
      }
    }
    
    // Now save the playlist status with the database ID
    if (dbId) {
      try {
        const updatedItem = get().newsItems.find(newsItem => newsItem.id === newsItemId);
        await upsertUserNewsMeta(user.id, dbId, { in_playlist: updatedItem?.inPlaylist });
      } catch (error) {
        console.error('Error saving playlist status:', error);
        // Revert UI change if database operation fails
        set(state => ({
          newsItems: state.newsItems.map(newsItem =>
            newsItem.id === newsItemId
              ? { ...newsItem, inPlaylist: !newsItem.inPlaylist }
              : newsItem
          )
        }));
      }
    }
  },
}));
