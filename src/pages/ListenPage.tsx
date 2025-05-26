import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const ListenPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { summaries, fetchSummaries, isLoading } = useSummaryStore();
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
    }
  }, [isAuthenticated, fetchSummaries]);
  
  // Filter summaries with audio
  const audioSummaries = summaries.filter(s => s.audioUrl);
  
  if (!isAuthenticated) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Listen</h1>
        
        <Card>
          <CardContent className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">
              Sign in to access audio summaries
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
  
  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Listen</h1>
        <p>Loading audio summaries...</p>
      </div>
    );
  }
  
  if (audioSummaries.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Listen</h1>
        
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
      <h1 className="text-2xl font-bold mb-6">Listen</h1>
      
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