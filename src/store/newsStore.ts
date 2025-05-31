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
              const metaItem = meta.find((m: any) => m.news_id === item.id);
              return metaItem ? { ...item, bookmarked: metaItem.bookmarked, inPlaylist: metaItem.inPlaylist } : item;
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
      const audioUrl = await generateAudio(audioText, user.isPremium, 'news');
      // Minimal required fields for audio upsert (debugging 400 error)
      const audioUpsertPayload = {
        url_hash: urlHash,
        source_url: newsItem.sourceUrl,
        title: newsItem.title,
        summary: newsItem.summary,
        category: newsItem.category,
        audio_url: audioUrl
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
      // Minimal required fields for TLDR upsert (debugging 400 error)
      const tldrUpsertPayload = {
        url_hash: urlHash,
        source_url: newsItem.sourceUrl,
        title: newsItem.title,
        summary: newsItem.summary, // short blurb
        tldr: tldrSummary,         // long AI TLDR
        category: newsItem.category
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
        await upsertUserNewsMeta(user.id, upsertResult.data.id, { inPlaylist: true });
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
    set(state => ({
      newsItems: state.newsItems.map(item =>
        item.id === newsItemId
          ? { ...item, bookmarked: !item.bookmarked }
          : item
      )
    }));
    const item = get().newsItems.find(item => item.id === newsItemId);
    if (item && item.id) {
      await upsertUserNewsMeta(user.id, item.id, { bookmarked: !item.bookmarked });
    }
  },

  togglePlaylist: async (newsItemId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    set(state => ({
      newsItems: state.newsItems.map(item =>
        item.id === newsItemId
          ? { ...item, inPlaylist: !item.inPlaylist }
          : item
      )
    }));
    const item = get().newsItems.find(item => item.id === newsItemId);
    if (item && item.id) {
      await upsertUserNewsMeta(user.id, item.id, { inPlaylist: !item.inPlaylist });
    }
  },
}));
