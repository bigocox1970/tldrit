import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../store/summaryStore';
import { useAuthStore } from '../store/authStore';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ReactMarkdown from 'react-markdown';

const SavedPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { summaries, fetchSummaries, isLoading } = useSummaryStore();
  const [selectedSummary, setSelectedSummary] = useState<string | null>(null);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
    }
  }, [isAuthenticated, fetchSummaries]);
  
  const handleSummaryClick = (summaryId: string) => {
    setSelectedSummary(summaryId === selectedSummary ? null : summaryId);
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SavedPage;