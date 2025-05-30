import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';
import { Volume2, Copy, Check, CheckSquare, Square } from 'lucide-react';
import { Summary } from '../types';
import { getUserIdByEmail, getSummaries } from '../lib/supabase';

const SavedPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { 
    summaries, 
    fetchSummaries, 
    isLoading, 
    generateAudioForSummary, 
    selectedSummaries, 
    setSelectedSummaries,
    isEditMode 
  } = useSummaryStore();
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState<{ [id: string]: boolean }>({});
  const [audioPlaying, setAudioPlaying] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exampleSummaries, setExampleSummaries] = useState<Summary[]>([]);
  const [exampleLoading, setExampleLoading] = useState(false);
  const audioRefs = React.useRef<{ [id: string]: HTMLAudioElement | null }>({});
  const [ttsError, setTtsError] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
    } else {
      // Fetch example summaries for unauthenticated users
      setExampleLoading(true);
      (async () => {
        const { id: exampleUserId } = await getUserIdByEmail('example@tldrit.app');
        if (exampleUserId) {
          const { data } = await getSummaries(exampleUserId);
          setExampleSummaries(data || []);
        }
        setExampleLoading(false);
      })();
    }
  }, [isAuthenticated, fetchSummaries]);
  
  const handleSummaryClick = (summaryId: string) => {
    if (isEditMode) {
      // In edit mode - handle selection
      if (selectedSummaries.includes(summaryId)) {
        setSelectedSummaries(selectedSummaries.filter(id => id !== summaryId));
      } else {
        setSelectedSummaries([...selectedSummaries, summaryId]);
      }
    } else {
      // Normal mode - expand/collapse summary
      setSelectedSummary(summaryId === selectedSummary ? null : summaryId);
    }
  };

  const handleSelectAll = () => {
    if (selectedSummaries.length === summaries.length) {
      // If all are selected, deselect all
      setSelectedSummaries([]);
    } else {
      // Otherwise, select all
      setSelectedSummaries(summaries.map(s => s.id));
    }
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
    setTtsError(prev => ({ ...prev, [summary.id]: '' }));
    
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
        // After generating, auto-play if audioUrl is now set
        if (summary.audioUrl) {
          if (!audioRefs.current[summary.id]) {
            audioRefs.current[summary.id] = new Audio(summary.audioUrl);
            audioRefs.current[summary.id]?.addEventListener('ended', () => {
              setAudioPlaying(prev => ({ ...prev, [summary.id]: false }));
            });
          }
          audioRefs.current[summary.id]?.play();
          setAudioPlaying(prev => ({ ...prev, [summary.id]: true }));
        }
      } catch (err: unknown) {
        let message = 'Failed to generate audio.';
        if (err instanceof Error) message = err.message;
        console.log('TTS error:', message);
        setTtsError(prev => ({ ...prev, [summary.id]: message }));
      } finally {
        setAudioLoading(prev => ({ ...prev, [summary.id]: false }));
      }
    }
  };
  
  if (!isAuthenticated) {
    if (exampleLoading) {
      return <div>Loading example TLDRs...</div>;
    }
    return (
      <div>
        <div className="space-y-4">
          {exampleSummaries.map((summary) => (
            <Card 
              key={summary.id}
              onClick={() => setSelectedSummary(summary.id)}
              className="cursor-pointer hover:border-blue-300 border border-gray-200 dark:border-gray-700 transition-all"
            >
              <CardContent>
                <h3 className="font-medium text-lg mb-2 line-clamp-1">
                  {summary.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                  {summary.summary}
                </p>
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
                  {ttsError[summary.id] && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      {ttsError[summary.id]}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
      
      {isEditMode && (
        <div className="mb-4 flex items-center">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {selectedSummaries.length === summaries.length ? (
              <CheckSquare size={20} className="text-blue-500" />
            ) : (
              <Square size={20} />
            )}
            <span className="text-sm font-medium">
              {selectedSummaries.length === summaries.length ? 'Deselect All' : 'Select All'}
            </span>
          </button>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            {selectedSummaries.length > 0 && `${selectedSummaries.length} selected`}
          </span>
        </div>
      )}
      
      <div className="space-y-4">
        {summaries.map((summary) => (
          <Card 
            key={summary.id}
            onClick={() => handleSummaryClick(summary.id)}
            className={`cursor-pointer hover:border-blue-300 border transition-all ${
              selectedSummaries.includes(summary.id)
                ? 'border-blue-500 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <CardContent>
              <div className="flex items-start gap-4">
                {isEditMode && (
                  <div className={`p-1 rounded-full border ${
                    selectedSummaries.includes(summary.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    <Check size={16} className={selectedSummaries.includes(summary.id) ? 'text-white' : 'text-transparent'} />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-2 line-clamp-1">
                    {summary.title}
                  </h3>
                  
                  {selectedSummary === summary.id ? (
                    <div className="relative">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title={copiedId === summary.id ? 'Copied!' : 'Copy summary'}
                            onClick={(e) => {
                              e.stopPropagation();
                              const textToCopy = summary.summary
                                .split('\n')
                                .filter(line => !/^#+ /.test(line.trim()))
                                .join('\n');
                              navigator.clipboard.writeText(textToCopy);
                              setCopiedId(summary.id);
                              setTimeout(() => setCopiedId(null), 1500);
                            }}
                          >
                            <Copy size={20} />
                          </button>
                          <button
                            onClick={(e) => handleSpeakerClick(summary, e)}
                            className={`p-2 rounded-full transition-colors border border-gray-200 dark:border-gray-700
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
                      </div>
                      {copiedId === summary.id && (
                        <span className="absolute top-0 right-24 mt-2 px-2 py-1 bg-green-500 text-white text-xs rounded shadow">Copied!</span>
                      )}
                      <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {summary.summary
                            .split('\n')
                            .filter(line => !/^#+ /.test(line.trim()))
                            .join('\n')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-2 flex-1">
                        {summary.summary}
                      </p>
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
                  )}
                  
                  <div className="flex justify-between items-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {new Date(summary.createdAt).toLocaleDateString()}
                    </span>
                    <span>
                      {summary.isEli5 ? 'ELI5' : `Level ${summary.summaryLevel}`}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedPage;
