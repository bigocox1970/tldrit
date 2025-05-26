import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../../store/summaryStore';
import { useAuthStore } from '../../store/authStore';
import Card, { CardContent } from '../ui/Card';
import Button from '../ui/Button';

const RecentSummaries: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { summaries, fetchSummaries, isLoading } = useSummaryStore();
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
    }
  }, [isAuthenticated, fetchSummaries]);
  
  if (!isAuthenticated) {
    return (
      <div className="py-8">
        <Card>
          <CardContent>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                Sign in to see your recent summaries
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create an account to save and access your summaries anytime.
              </p>
              <Button 
                variant="primary"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="py-8">
        <Card>
          <CardContent>
            <div className="text-center">
              <p>Loading recent summaries...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (summaries.length === 0) {
    return (
      <div className="py-8">
        <Card>
          <CardContent>
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                No summaries yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start by creating your first summary.
              </p>
              <Button 
                variant="primary"
                onClick={() => navigate('/summarize')}
              >
                Create Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Recent Summaries</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/saved')}
        >
          View All
        </Button>
      </div>
      
      <div className="space-y-4">
        {summaries.slice(0, 3).map((summary) => (
          <Card 
            key={summary.id}
            onClick={() => navigate(`/saved/${summary.id}`)}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecentSummaries;