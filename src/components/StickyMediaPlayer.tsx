import React, { useEffect, useState } from 'react';
import { useAudioStore } from '../store/audioStore';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface StickyMediaPlayerProps {
  playlist: Array<{
    id: string;
    title: string;
    audioUrl?: string;
    type: 'summary' | 'news';
  }>;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
}

const StickyMediaPlayer: React.FC<StickyMediaPlayerProps> = ({
  playlist,
  currentIndex,
  onNext,
  onPrevious
}) => {
  const { currentlyPlaying, isPlaying, toggleAudio, audioInstance } = useAudioStore();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const currentItem = playlist.find(item => item.id === currentlyPlaying);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioInstance;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Set initial values
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioInstance]);

  // Reset time and duration when no audio is playing
  useEffect(() => {
    if (!audioInstance) {
      setCurrentTime(0);
      setDuration(0);
    }
  }, [audioInstance]);

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioInstance;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format time
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentItem || !currentItem.audioUrl) {
    return null;
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40">
      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Progress bar */}
        <div className="mb-3">
          <div 
            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Previous button */}
          <button
            onClick={onPrevious}
            disabled={currentIndex <= 0}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipBack size={20} />
          </button>
          
          {/* Play/Pause button */}
          <button
            onClick={() => toggleAudio(currentItem.id, currentItem.audioUrl!)}
            className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            {isPlaying ? (
              <Pause size={24} />
            ) : (
              <Play size={24} />
            )}
          </button>
          
          {/* Next button */}
          <button
            onClick={onNext}
            disabled={currentIndex >= playlist.length - 1}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipForward size={20} />
          </button>
          
          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {currentItem.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isPlaying ? 'Now Playing' : 'Paused'} • {currentIndex + 1} of {playlist.length}
            </p>
          </div>
          
          {/* Type badge */}
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {currentItem.type === 'summary' ? 'TLDR' : 'News'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StickyMediaPlayer; 