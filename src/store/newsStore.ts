import { create } from 'zustand';
import { NewsItem, UserInterest } from '../types';
import { getAvailableInterests, getNewsItems, saveUserInterests } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { generateAudio } from '../lib/ai';
import { supabase } from '../lib/supabase';

interface NewsState {
  newsItems: NewsItem[];
  interests: UserInterest[];
  selectedInterests: string[];
  isLoading: boolean;
  error: string | null;
  fetchNewsItems: () => Promise<void>;
  fetchAvailableInterests: () => Promise<void>;
  updateUserInterests: (interests: string[]) => Promise<void>;
  generateAudioForNewsItem: (newsItemId: string) => Promise<void>;
  refreshNews: () => Promise<void>;
}

export const useNewsStore = create<NewsState>((set, get) => ({
  newsItems: [],
  interests: [],
  selectedInterests: [],
  isLoading: false,
  error: null,
  
  fetchNewsItems: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await getNewsItems(user.id);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      const formattedNews: NewsItem[] = data?.map(item => ({
        id: item.id,
        title: item.title,
        sourceUrl: item.source_url,
        category: item.category,
        summary: item.summary,
        publishedAt: item.published_at,
        imageUrl: item.image_url,
        audioUrl: item.audio_url,
      })) || [];
      
      set({ 
        newsItems: formattedNews, 
        isLoading: false, 
        error: null 
      });
    } catch {
      set({ 
        error: 'Failed to fetch news', 
        isLoading: false 
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
  
  refreshNews: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true, error: null });
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data?.session?.access_token;
      if (!accessToken) throw new Error('No access token');
      const response = await fetch('/.netlify/functions/fetch-news', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to refresh news');
      
      await get().fetchNewsItems();
      
      set({ isLoading: false, error: null });
    } catch {
      set({ 
        error: 'Failed to refresh news', 
        isLoading: false 
      });
    }
  },
}));