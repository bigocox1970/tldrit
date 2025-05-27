import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';
import { Volume2 } from 'lucide-react';
import { Summary } from '../types';

const SavedPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { summaries, fetchSummaries, isLoading, generateAudioForSummary } = useSummaryStore();
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState<{ [id: string]: boolean }>({});
  const [audioPlaying, setAudioPlaying] = useState<{ [id: string]: boolean }>({});
  const audioRefs = React.useRef<{ [id: string]: HTMLAudioElement | null }>({});
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
    }
  }, [isAuthenticated, fetchSummaries]);
  
  const handleSummaryClick = (summaryId: string) => {
    setSelectedSummary(summaryId === selectedSummary ? null : summaryId);
  };
  
  useEffect(() => {
    // Cleanup audio instances on unmount
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, []);

  const handleSpeakerClick = async (summary: Summary, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Stop any currently playing audio
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (audio && id !== summary.id) {
        audio.pause();
        audio.currentTime = 0;
        setAudioPlaying(prev => ({ ...prev, [id]: false }));
      }
    });

    if (summary.audioUrl) {
      // Initialize audio if not already done
      if (!audioRefs.current[summary.id]) {
        audioRefs.current[summary.id] = new Audio(summary.audioUrl);
        audioRefs.current[summary.id]?.addEventListener('ended', () => {
          setAudioPlaying(prev => ({ ...prev, [summary.id]: false }));
        });
      }

      // Toggle play/pause
      if (audioPlaying[summary.id]) {
        audioRefs.current[summary.id]?.pause();
        setAudioPlaying(prev => ({ ...prev, [summary.id]: false }));
      } else {
        audioRefs.current[summary.id]?.play();
        setAudioPlaying(prev => ({ ...prev, [summary.id]: true }));
      }
    } else {
      // Generate audio
      setAudioLoading(prev => ({ ...prev, [summary.id]: true }));
      try {
        await generateAudioForSummary(summary.id);
      } finally {
        setAudioLoading(prev => ({ ...prev, [summary.id]: false }));
      }
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div>
        {/* <h1 className="text-2xl font-bold mb-6">Saved TL;DRs</h1> */}
        
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">
              Sign in to view your saved TL;DRs
            </h3>
            <Button 
              variant="primary"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading && summaries.length === 0) {
    return (
      <div>
        {/* <h1 className="text-2xl font-bold mb-6">Saved TL;DRs</h1> */}
        <p>Loading saved TL;DRs...</p>
      </div>
    );
  }
  
  if (summaries.length === 0) {
    return (
      <div>
        {/* <h1 className="text-2xl font-bold mb-6">Saved TL;DRs</h1> */}
        
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">
              You don't have any saved TL;DRs yet
            </h3>
            <Button 
              variant="primary"
              onClick={() => navigate('/summarize')}
            >
              Create Summary
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div>
      {/* <h1 className="text-2xl font-bold mb-6">Saved TL;DRs</h1> */}
      
      <div className="space-y-4">
        {summaries.map((summary) => (
          <Card 
            key={summary.id}
            onClick={() => handleSummaryClick(summary.id)}
            className="cursor-pointer hover:border-blue-300 border border-gray-200 dark:border-gray-700 transition-all"
          >
            <CardContent>
              <h3 className="font-medium text-lg mb-2 line-clamp-1">
                {summary.title}
              </h3>
              
              {selectedSummary === summary.id ? (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{summary.summary}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                  {summary.summary}
                </p>
              )}
              
              <div className="flex justify-between items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {new Date(summary.createdAt).toLocaleDateString()}
                </span>
                <span>
                  {summary.isEli5 ? 'ELI5' : `Level ${summary.summaryLevel}`}
                </span>
                  <button
                    onClick={(e) => handleSpeakerClick(summary, e)}
                    className={`ml-2 p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-700
                      ${audioLoading[summary.id] 
                        ? 'animate-pulse bg-green-200' 
                        : audioPlaying[summary.id]
                        ? 'bg-green-600'
                        : summary.audioUrl 
                        ? 'bg-green-500' 
                        : 'bg-gray-200 dark:bg-gray-700'
                      }
                    `}
                    title={
                      audioLoading[summary.id]
                        ? 'Generating audio...'
                        : audioPlaying[summary.id]
                        ? 'Pause audio'
                        : summary.audioUrl
                        ? 'Play audio'
                        : 'Generate audio'
                    }
                    disabled={audioLoading[summary.id]}
                  >
                    <Volume2
                      size={20}
                      className={
                        audioLoading[summary.id]
                          ? 'text-green-700'
                          : audioPlaying[summary.id]
                          ? 'text-white animate-pulse'
                          : summary.audioUrl
                          ? 'text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }
                    />
                  </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedPage;
