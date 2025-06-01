import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Play, Pause, GripVertical, CheckSquare, Square } from 'lucide-react';
import { useAudioStore } from '../store/audioStore';
import Card, { CardContent } from './ui/Card';
import Button from './ui/Button';

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

interface DraggablePlaylistItemProps {
  item: PlaylistItem;
  isSelected: boolean;
  isEditMode: boolean;
  onSelect: (id: string) => void;
  onTrackJump?: (id: string) => void;
  onNavigateToSource?: () => void;
}

const DraggablePlaylistItem: React.FC<DraggablePlaylistItemProps> = ({
  item,
  isSelected,
  isEditMode,
  onSelect,
  onTrackJump,
  onNavigateToSource
}) => {
  const { currentlyPlaying, isPlaying, toggleAudio } = useAudioStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleItemClick = () => {
    if (isEditMode) {
      onSelect(item.id);
    } else if (onTrackJump && item.audioUrl) {
      // Jump to this track if not in edit mode and has audio
      onTrackJump(item.id);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.audioUrl) {
      toggleAudio(item.id, item.audioUrl);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'z-50' : ''}`}
    >
      <Card 
        className={`border transition-colors ${
          currentlyPlaying === item.id && isPlaying
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
            : 'border-gray-200 dark:border-gray-700'
        } ${
          isEditMode && isSelected 
            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : ''
        } ${isDragging ? 'shadow-lg' : ''} ${
          !isEditMode && item.audioUrl ? 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer' : 'cursor-default'
        }`}
        onClick={handleItemClick}
      >
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            {/* Drag handle */}
            <div 
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <GripVertical size={16} className="text-gray-400" />
            </div>
            
            {/* Selection checkbox */}
            {isEditMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(item.id);
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isSelected ? (
                  <CheckSquare size={18} className="text-blue-500" />
                ) : (
                  <Square size={18} className="text-gray-400" />
                )}
              </button>
            )}
            
            {/* Play button */}
            <button
              onClick={handlePlayClick}
              disabled={!item.audioUrl}
              className={`p-2 rounded-full transition-colors ${
                item.audioUrl
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              title={
                !item.audioUrl 
                  ? 'Audio not available' 
                  : currentlyPlaying === item.id && isPlaying 
                    ? 'Pause' 
                    : 'Play'
              }
            >
              {currentlyPlaying === item.id && isPlaying ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
            </button>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-medium text-sm line-clamp-2 text-gray-900 dark:text-gray-100">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Type/Category badge */}
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {item.type === 'summary' 
                      ? (item.isEli5 ? 'ELI5' : `Level ${item.summaryLevel}`)
                      : item.category
                    }
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {item.type === 'summary' 
                    ? item.createdAt && new Date(item.createdAt).toLocaleDateString()
                    : item.publishedAt && new Date(item.publishedAt).toLocaleDateString()
                  }
                </span>
                
                {/* Audio status */}
                <span className={`${
                  currentlyPlaying === item.id && isPlaying 
                    ? 'text-blue-500 font-medium' 
                    : item.audioUrl 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400'
                }`}>
                  {currentlyPlaying === item.id && isPlaying 
                    ? 'Playing' 
                    : item.audioUrl 
                      ? 'Ready' 
                      : 'No Audio'
                  }
                </span>
              </div>
              
              {/* Source link for news items */}
              {item.type === 'news' && item.sourceUrl && (
                <div className="mt-2">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium"
                  >
                    Read Full Article →
                  </a>
                </div>
              )}
              
              {/* No audio message with action */}
              {!item.audioUrl && (
                <div className="mt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (onNavigateToSource) onNavigateToSource();
                    }}
                    className="text-xs py-1 px-2 h-6"
                  >
                    Generate Audio
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DraggablePlaylistItem; 