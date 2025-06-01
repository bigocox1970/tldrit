/**
 * SUMMARY STORE - ZUSTAND STATE MANAGEMENT
 * 
 * This store manages all summary-related state and operations for TLDRit.
 * 
 * KEY RESPONSIBILITIES:
 * - Processing different content types (text, URL, file)
 * - Creating summaries using AI
 * - Managing summary history and persistence
 * - Generating audio for summaries
 * 
 * CONTENT PROCESSING FLOW:
 * 1. Text: Direct processing
 * 2. URL: Extract content via Supabase function → summarize
 * 3. File: Process via Netlify function → summarize
 * 
 * The createSummary function handles all three input types and routes them
 * through the appropriate processing pipeline before generating summaries.
 */

import { create } from 'zustand';
import { Summary, SummaryRequest } from '../types';
import { extractContentFromUrl, generateAudio, processFileContent, summarizeContent } from '../lib/ai';
import { getSummaries, saveSummary, deleteSummaries, updateSummary, updateSummaryPlaylist } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface SummaryState {
  summaries: Summary[];
  currentSummary: Summary | null;
  isLoading: boolean;
  error: string | null;
  fetchSummaries: () => Promise<void>;
  createSummary: (request: SummaryRequest) => Promise<void>;
  generateAudioForSummary: (summaryId: string) => Promise<void>;
  deleteSummaries: (summaryIds: string[]) => Promise<void>;
  selectedSummaries: string[];
  setSelectedSummaries: (summaryIds: string[]) => void;
  isEditMode: boolean;
  setEditMode: (isEdit: boolean) => void;
  // Listen page specific selection state
  selectedListenItems: string[];
  setSelectedListenItems: (itemIds: string[]) => void;
  isListenEditMode: boolean;
  setListenEditMode: (isEdit: boolean) => void;
  removeFromPlaylist: (itemIds: string[]) => Promise<void>;
  togglePlaylist: (summaryId: string) => Promise<void>;
}

export const useSummaryStore = create<SummaryState>((set, get) => ({
  summaries: [],
  currentSummary: null,
  isLoading: false,
  error: null,
  selectedSummaries: [],
  isEditMode: false,
  selectedListenItems: [],
  isListenEditMode: false,
  
  setSelectedSummaries: (summaryIds: string[]) => {
    set({ selectedSummaries: summaryIds });
  },

  setEditMode: (isEdit: boolean) => {
    set({ isEditMode: isEdit, selectedSummaries: isEdit ? [] : [] });
  },
  
  fetchSummaries: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await getSummaries(user.id);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      // Transform data from Supabase format to our app format
      const formattedSummaries: Summary[] = data?.map(item => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        originalContent: item.original_content,
        summary: item.summary,
        createdAt: item.created_at,
        audioUrl: item.audio_url,
        isEli5: item.is_eli5,
        summaryLevel: item.summary_level,
        inPlaylist: item.in_playlist || false,
      })) || [];
      
      set({ 
        summaries: formattedSummaries, 
        isLoading: false, 
        error: null 
      });
    } catch {
      set({ 
        error: 'Failed to fetch summaries', 
        isLoading: false 
      });
    }
  },
  
  createSummary: async (request: SummaryRequest) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    // Enforce 10 TLDRs per month for free users
    if (!user.isPremium) {
      // Count summaries created this month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const summariesThisMonth = get().summaries.filter(s => {
        const created = new Date(s.createdAt);
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
      });
      if (summariesThisMonth.length >= 10) {
        set({ error: 'Free accounts are limited to 10 TLDRs per month. Upgrade to Pro for unlimited summaries.' });
        return;
      }
    }
    
    set({ isLoading: true, error: null });
    try {
      // Process the content based on its type
      let processedContent = '';
      let originalContentKey = '';
      
      if (request.contentType === 'text') {
        processedContent = request.content as string;
        originalContentKey = request.content as string;
      } else if (request.contentType === 'url') {
        console.log('[summaryStore] Calling extractContentFromUrl with:', request.content);
        processedContent = await extractContentFromUrl(request.content as string);
        console.log('[summaryStore] extractContentFromUrl returned:', processedContent);
        originalContentKey = request.content as string; // Use the input URL as the key
      } else if (request.contentType === 'file') {
        console.log('[summaryStore] Processing file:', (request.content as File).name);
        processedContent = await processFileContent(request.content as File);
        console.log('[summaryStore] File processing returned:', processedContent.substring(0, 100) + '...');
        originalContentKey = (request.content as File).name;
      }
      
      // Generate the summary
      const summaryResult = await summarizeContent(processedContent, {
        isPremium: user.isPremium,
        isEli5: request.isEli5,
        summaryLevel: request.summaryLevel,
      });
      
      // Extract a title from the content
      const title = generateTitleFromContent(processedContent);
      
      // Save to database
      const newSummary = {
        userId: user.id,
        title,
        originalContent: originalContentKey,
        summary: summaryResult.summary,
        isEli5: request.isEli5,
        summaryLevel: request.summaryLevel,
      };
      
      const { data, error } = await saveSummary(newSummary);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      // Format the new summary to match our app format
      const formattedSummary: Summary = {
        id: data?.[0].id,
        userId: data?.[0].user_id,
        title: data?.[0].title,
        originalContent: data?.[0].original_content,
        summary: data?.[0].summary,
        createdAt: data?.[0].created_at,
        audioUrl: data?.[0].audio_url,
        isEli5: data?.[0].is_eli5,
        summaryLevel: data?.[0].summary_level,
        inPlaylist: data?.[0].in_playlist || false,
      };
      
      set(state => ({ 
        summaries: [formattedSummary, ...state.summaries],
        currentSummary: formattedSummary,
        isLoading: false, 
        error: null 
      }));
    } catch {
      set({ 
        error: 'Failed to create summary', 
        isLoading: false 
      });
    }
  },
  
  generateAudioForSummary: async (summaryId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    const summary = get().summaries.find(s => s.id === summaryId);
    if (!summary) return;
    
    set({ isLoading: true, error: null });
    try {
      const audioUrl = await generateAudio(
        summary.summary, 
        user.isPremium, 
        'user', 
        summary.title
      );
      
      // Update the summary with the new audio URL
      const updatedSummary = { ...summary, audioUrl };
      
      // Update in database using updateSummary instead of saveSummary
      await updateSummary(summaryId, {
        audioUrl: updatedSummary.audioUrl
      });
      
      // Update in local state
      set(state => ({
        summaries: state.summaries.map(s => 
          s.id === summaryId ? updatedSummary : s
        ),
        currentSummary: state.currentSummary?.id === summaryId 
          ? updatedSummary 
          : state.currentSummary,
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

  deleteSummaries: async (summaryIds: string[]) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true, error: null });
    try {
      const { error } = await deleteSummaries(summaryIds);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }
      
      // Remove deleted summaries from local state and reset edit mode
      set(state => ({
        summaries: state.summaries.filter(s => !summaryIds.includes(s.id)),
        selectedSummaries: [],
        isEditMode: false,
        isLoading: false,
        error: null
      }));
    } catch {
      set({ 
        error: 'Failed to delete summaries', 
        isLoading: false 
      });
    }
  },

  togglePlaylist: async (summaryId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true, error: null });
    try {
      const summary = get().summaries.find(s => s.id === summaryId);
      if (!summary) return;
      
      const updatedSummary = { ...summary, inPlaylist: !summary.inPlaylist };
      
      await updateSummaryPlaylist(summaryId, updatedSummary.inPlaylist);
      
      set(state => ({
        summaries: state.summaries.map(s => 
          s.id === summaryId ? updatedSummary : s
        ),
        currentSummary: state.currentSummary?.id === summaryId 
          ? updatedSummary 
          : state.currentSummary,
        isLoading: false,
        error: null,
      }));
    } catch {
      set({ 
        error: 'Failed to toggle playlist', 
        isLoading: false 
      });
    }
  },

  // Listen page specific methods
  setSelectedListenItems: (itemIds: string[]) => {
    set({ selectedListenItems: itemIds });
  },

  setListenEditMode: (isEdit: boolean) => {
    set({ isListenEditMode: isEdit, selectedListenItems: isEdit ? [] : [] });
  },

  removeFromPlaylist: async (itemIds: string[]) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isLoading: true, error: null });
    try {
      // Remove items from playlist by setting inPlaylist to false
      await Promise.all(itemIds.map(id => 
        get().togglePlaylist(id)
      ));
      
      // Clear selection and exit edit mode
      set({ 
        selectedListenItems: [], 
        isListenEditMode: false,
        isLoading: false 
      });
    } catch {
      set({ 
        error: 'Failed to remove items from playlist', 
        isLoading: false 
      });
    }
  },
}));

// Helper function to generate a title from content
function generateTitleFromContent(content: string): string {
  // Get first 50 characters and find the last space to avoid cutting words
  const snippet = content.substring(0, 50);
  const lastSpaceIndex = snippet.lastIndexOf(' ');
  
  // If we found a space, use it to trim, otherwise use the whole snippet
  const trimmedSnippet = lastSpaceIndex > 0 
    ? snippet.substring(0, lastSpaceIndex) 
    : snippet;
  
  return trimmedSnippet + (content.length > trimmedSnippet.length ? '...' : '');
}
