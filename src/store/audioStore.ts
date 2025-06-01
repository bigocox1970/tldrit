import { create } from 'zustand';

interface AudioState {
  currentlyPlaying: string | null; // ID of currently playing audio
  audioInstance: HTMLAudioElement | null;
  isPlaying: boolean;
  onTrackEnd: (() => void) | null; // Callback for when track ends
  
  // Actions
  playAudio: (id: string, audioUrl: string) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  toggleAudio: (id: string, audioUrl: string) => void;
  setOnTrackEnd: (callback: (() => void) | null) => void;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  currentlyPlaying: null,
  audioInstance: null,
  isPlaying: false,
  onTrackEnd: null,

  setOnTrackEnd: (callback: (() => void) | null) => {
    set({ onTrackEnd: callback });
  },

  playAudio: (id: string, audioUrl: string) => {
    const state = get();
    
    // Stop any currently playing audio
    if (state.audioInstance) {
      state.audioInstance.pause();
      state.audioInstance.currentTime = 0;
    }

    // Create new audio instance
    const audio = new Audio(audioUrl);
    
    // Set up event listeners
    audio.addEventListener('ended', () => {
      const currentState = get();
      if (currentState.onTrackEnd) {
        currentState.onTrackEnd();
      } else {
        set({ currentlyPlaying: null, audioInstance: null, isPlaying: false });
      }
    });

    audio.addEventListener('error', () => {
      console.error('Audio playback error');
      set({ currentlyPlaying: null, audioInstance: null, isPlaying: false });
    });

    // Play the audio
    audio.play().then(() => {
      set({
        currentlyPlaying: id,
        audioInstance: audio,
        isPlaying: true,
      });
    }).catch((error) => {
      console.error('Failed to play audio:', error);
      set({ currentlyPlaying: null, audioInstance: null, isPlaying: false });
    });
  },

  pauseAudio: () => {
    const state = get();
    if (state.audioInstance && state.isPlaying) {
      state.audioInstance.pause();
      set({ isPlaying: false });
    }
  },

  stopAudio: () => {
    const state = get();
    if (state.audioInstance) {
      state.audioInstance.pause();
      state.audioInstance.currentTime = 0;
    }
    set({ currentlyPlaying: null, audioInstance: null, isPlaying: false });
  },

  toggleAudio: (id: string, audioUrl: string) => {
    const state = get();
    
    if (state.currentlyPlaying === id && state.isPlaying) {
      // Currently playing this track - pause it
      state.pauseAudio();
    } else if (state.currentlyPlaying === id && !state.isPlaying) {
      // This track is loaded but paused - resume it
      if (state.audioInstance) {
        state.audioInstance.play().then(() => {
          set({ isPlaying: true });
        });
      }
    } else {
      // Different track or no track playing - play this one
      state.playAudio(id, audioUrl);
    }
  },
})); 