import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getExampleSummaries } from '../lib/supabase';
import { Summary } from '../types';

const ListenPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { summaries, fetchSummaries, isLoading } = useSummaryStore();
  const [exampleSummaries, setExampleSummaries] = useState<Summary[]>([]);
  const [exampleLoading, setExampleLoading] = useState(false);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
    } else {
      // Fetch example summaries for unauthenticated users
      setExampleLoading(true);
      (async () => {
        const { data } = await getExampleSummaries();
        // Filter to only show summaries with audio
        setExampleSummaries((data || []).filter(s => s.audioUrl));
        setExampleLoading(false);
      })();
    }
  }, [isAuthenticated, fetchSummaries]);
  
  // Filter summaries with audio
  const audioSummaries = summaries.filter(s => s.audioUrl);
  
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