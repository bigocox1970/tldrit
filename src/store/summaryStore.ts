import { create } from 'zustand';
import { Summary, SummaryRequest } from '../types';
import { extractContentFromUrl, generateAudio, processFileContent, summarizeContent } from '../lib/ai';
import { getSummaries, saveSummary } from '../lib/supabase';
import { useAuthStore } from './authStore';

interface SummaryState {
  summaries: Summary[];
  currentSummary: Summary | null;
  isLoading: boolean;
  error: string | null;
  fetchSummaries: () => Promise<void>;
  createSummary: (request: SummaryRequest) => Promise<void>;
  generateAudioForSummary: (summaryId: string) => Promise<void>;
}

export const useSummaryStore = create<SummaryState>((set, get) => ({
  summaries: [],
  currentSummary: null,
  isLoading: false,
  error: null,
  
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
      })) || [];
      
      set({ 
        summaries: formattedSummaries, 
        isLoading: false, 
        error: null 
      });
    } catch (err) {
      set({ 
        error: 'Failed to fetch summaries', 
        isLoading: false 
      });
    }
  },
  
  createSummary: async (request: SummaryRequest) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ isLoading: true, error: null });
    try {
      // Process the content based on its type
      let processedContent = '';
      let originalContentKey = '';
      
      if (request.contentType === 'text') {
        processedContent = request.content;
        originalContentKey = request.content;
      } else if (request.contentType === 'url') {
        processedContent = await extractContentFromUrl(request.content);
        originalContentKey = request.content; // Use the input URL as the key
      } else if (request.contentType === 'file') {
        processedContent = await processFileContent(request.content as unknown as File);
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
      };
      
      set(state => ({ 
        summaries: [formattedSummary, ...state.summaries],
        currentSummary: formattedSummary,
        isLoading: false, 
        error: null 
      }));
    } catch (err) {
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
      const audioUrl = await generateAudio(summary.summary, user.isPremium);
      
      // Update the summary with the new audio URL
      const updatedSummary = { ...summary, audioUrl };
      
      // Update in database
      await saveSummary({
        userId: updatedSummary.userId,
        title: updatedSummary.title,
        originalContent: updatedSummary.originalContent,
        summary: updatedSummary.summary,
        isEli5: updatedSummary.isEli5,
        summaryLevel: updatedSummary.summaryLevel,
        audioUrl: updatedSummary.audioUrl,
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
    } catch (err) {
      set({ 
        error: 'Failed to generate audio', 
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