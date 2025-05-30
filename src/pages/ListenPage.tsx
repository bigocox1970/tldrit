import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getUserIdByEmail, getSummaries } from '../lib/supabase';
import { Volume2 } from 'lucide-react';
import { Summary } from '../types';

const ListenPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { summaries, fetchSummaries, isLoading, generateAudioForSummary } = useSummaryStore();
  const [audioLoading, setAudioLoading] = useState<{ [id: string]: boolean }>({});
  const [audioPlaying, setAudioPlaying] = useState<{ [id: string]: boolean }>({});
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
  
  // Filter summaries with audio
  const audioSummaries = summaries.filter(s => s.audioUrl);
  
  // Speaker button logic for example/demo TLDRs
  const handleSpeakerClick = async (summary: Summary, e: React.MouseEvent) => {
    e.stopPropagation();
    setTtsError(prev => ({ ...prev, [summary.id]: '' }));
    if (!summary) return;
    if (audioLoading[summary.id]) return;
    if (summary.audioUrl) {
      // Play or pause audio
      if (!audioRefs.current[summary.id]) {
        audioRefs.current[summary.id] = new Audio(summary.audioUrl);
        audioRefs.current[summary.id]?.addEventListener('ended', () => {
          setAudioPlaying((prev) => ({ ...prev, [summary.id]: false }));
        });
      }
      if (audioPlaying[summary.id]) {
        audioRefs.current[summary.id]?.pause();
        setAudioPlaying((prev) => ({ ...prev, [summary.id]: false }));
      } else {
        audioRefs.current[summary.id]?.play();
        setAudioPlaying((prev) => ({ ...prev, [summary.id]: true }));
      }
    } else {
      // Generate audio
      setAudioLoading((prev) => ({ ...prev, [summary.id]: true }));
      try {
        await generateAudioForSummary(summary.id);
      } catch (err: unknown) {
        let message = 'Failed to generate audio.';
        if (err instanceof Error) message = err.message;
        console.log('TTS error:', message);
        setTtsError(prev => ({ ...prev, [summary.id]: message }));
      } finally {
        setAudioLoading((prev) => ({ ...prev, [summary.id]: false }));
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
  
  if (isLoading) {
    return (
      <div>
        {/* <h1 className="text-2xl font-bold mb-6">Listen</h1> */}
        <p>Loading audio summaries...</p>
      </div>
    );
  }
  
  if (audioSummaries.length === 0) {
    return (
      <div>
        {/* <h1 className="text-2xl font-bold mb-6">Listen</h1> */}
        
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">
              You don't have any audio summaries yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {user?.isPremium 
                ? 'Generate audio for your summaries to listen to them here.'
                : 'Upgrade to Pro to generate audio for all your summaries.'}
            </p>
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
      {/* <h1 className="text-2xl font-bold mb-6">Listen</h1> */}
      
      <div className="space-y-4">
        {audioSummaries.map((summary) => (
          <Card key={summary.id} className="border border-gray-200 dark:border-gray-700">
            <CardContent>
              <h3 className="font-medium text-lg mb-4">
                {summary.title}
              </h3>
              
              <audio 
                className="w-full mb-4" 
                controls 
                src={summary.audioUrl}
              >
                Your browser does not support the audio element.
              </audio>
              
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {new Date(summary.createdAt).toLocaleDateString()}
                </span>
                <span>
                  {summary.isEli5 ? 'ELI5' : `Level ${summary.summaryLevel}`}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ListenPage;