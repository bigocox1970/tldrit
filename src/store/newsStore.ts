import { create } from 'zustand';
import { NewsItem, UserInterest } from '../types';
import { getAvailableInterests, saveUserInterests } from '../lib/supabase';
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
        categories = ['crypto', 'ai', 'entertainment', 'science', 'politics', 'sports', 'technology'];
      }
      
      console.log('Fetching news for categories:', categories);
      
      // Use Netlify function for reliable news fetching with images
      const response = await fetch('/.netlify/functions/fetch-news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch news');
      }

      const newsItems: NewsItem[] = data.newsItems || [];
      
      set({ 
        newsItems, 
        isLoading: false, 
        error: null,
        isFetching: false
      });
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
    
    set({ isLoading: true, error: null });
    try {
      const audioUrl = await generateAudio(newsItem.summary, user.isPremium);
      
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

    // Check if TLDR already exists
    if (newsItem.tldr) {
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
      
      set(state => ({
        newsItems: state.newsItems.map(item => 
          item.id === newsItemId 
            ? { ...item, tldr: tldrSummary } 
            : item
        ),
        tldrLoading: { ...state.tldrLoading, [newsItemId]: false },
        error: null,
      }));
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
}));
