import { create } from 'zustand';
import { NewsItem, UserInterest } from '../types';
import { getAvailableInterests, saveUserInterests, getUserNewsMeta, upsertUserNewsMeta, updateNewsTLDR, updateNewsAudio, getNewsItemById } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { generateAudio, summarizeUrl } from '../lib/ai';

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
    
    let newsItem = get().newsItems.find(item => item.id === newsItemId);
    if (!newsItem) return;

    // Always check Supabase for latest audio_url before generating
    const { data: dbNews, error: dbError } = await getNewsItemById(newsItemId);
    if (dbError) {
      set({ error: 'Failed to check audio in database' });
      return;
    }
    if (dbNews && dbNews.audio_url) {
      // Update local store and return
      set(state => ({
        newsItems: state.newsItems.map(item =>
          item.id === newsItemId ? { ...item, audioUrl: dbNews.audio_url } : item
        ),
        isLoading: false,
        error: null,
      }));
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const audioText = newsItem.tldr || newsItem.summary;
      const audioUrl = await generateAudio(audioText, user.isPremium);
      
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
    
    let newsItem = get().newsItems.find(item => item.id === newsItemId);
    if (!newsItem) return;

    // Always check Supabase for latest TLDR before generating
    const { data: dbNews, error: dbError } = await getNewsItemById(newsItemId);
    if (dbError) {
      set({ error: 'Failed to check TLDR in database' });
      return;
    }
    if (dbNews && dbNews.tldr) {
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
      console.log(`Generating TLDR for: ${newsItem.title}`);
      
      // Use the existing summarizeUrl function from ai.ts with options
      const tldrSummary = await summarizeUrl(newsItem.sourceUrl, user.isPremium, options);
      // Update shared TLDR in Supabase
      await updateNewsTLDR(newsItemId, tldrSummary);
      
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
      await upsertUserNewsMeta(user.id, newsItemId, { inPlaylist: true });
    } catch (error) {
      console.error('Error generating TLDR:', error);
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
    if (item) {
      await upsertUserNewsMeta(user.id, newsItemId, { bookmarked: !item.bookmarked });
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
    if (item) {
      await upsertUserNewsMeta(user.id, newsItemId, { inPlaylist: !item.inPlaylist });
    }
  },
}));
