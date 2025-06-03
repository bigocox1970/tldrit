import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSummaryStore } from '../../store/summaryStore';
import { useAuthStore } from '../../store/authStore';
import Card, { CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Helper function to get descriptive summary level label
const getSummaryLevelLabel = (level: number, isEli5: boolean): string => {
  if (isEli5) return 'ELI5';
  
  const labels = {
    1: 'TLDR',
    2: 'Abbreviated', 
    3: 'Full'
  };
  
  return labels[level as keyof typeof labels] || `Level ${level}`;
};

const RecentSummaries: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { summaries, fetchSummaries, isLoading } = useSummaryStore();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [slideDirection, setSlideDirection] = React.useState<'left' | 'right' | null>(null);
  const [displayIndex, setDisplayIndex] = React.useState(0);
  const touchStartX = React.useRef<number | null>(null);
  const touchEndX = React.useRef<number | null>(null);
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchSummaries();
    }
  }, [isAuthenticated, fetchSummaries]);
  
  // Clamp index if summaries change
  useEffect(() => {
    if (currentIndex > summaries.length - 1) {
      setCurrentIndex(Math.max(0, summaries.length - 1));
    }
  }, [summaries, currentIndex]);
  
  // Slide animation logic
  React.useEffect(() => {
    if (slideDirection) {
      const timeout = setTimeout(() => {
        setDisplayIndex(currentIndex);
        setSlideDirection(null);
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setDisplayIndex(currentIndex);
    }
  }, [currentIndex, slideDirection]);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const delta = touchStartX.current - touchEndX.current;
      if (delta > 50 && currentIndex < summaries.length - 1) {
        setSlideDirection('right');
        setCurrentIndex(i => Math.min(summaries.length - 1, i + 1));
      } else if (delta < -50 && currentIndex > 0) {
        setSlideDirection('left');
        setCurrentIndex(i => Math.max(0, i - 1));
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };
  
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
  
  const showLeft = currentIndex > 0;
  const showRight = currentIndex < summaries.length - 1;
  
  return (
    <div className="py-4">
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
      <div className="relative w-full max-w-2xl mx-auto" 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Overlay left arrow */}
        {showLeft && (
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 shadow"
            onClick={() => {
              setSlideDirection('left');
              setCurrentIndex(i => Math.max(0, i - 1));
            }}
            aria-label="Previous summary"
            style={{ transform: 'translateY(-50%)' }}
          >
            <ChevronLeft size={32} />
          </button>
        )}
        {/* Card with slide transition */}
        <div
          key={summaries[displayIndex].id}
          className={`w-full transition-transform duration-300 ease-in-out transform
            ${slideDirection === 'left' ? '-translate-x-full' : ''}
            ${slideDirection === 'right' ? 'translate-x-full' : ''}
            ${!slideDirection ? 'translate-x-0' : ''}
          `}
        >
          <Card 
            onClick={() => navigate(`/saved/${summaries[displayIndex].id}`)}
            className="cursor-pointer hover:border-blue-300 border border-gray-200 dark:border-gray-700 transition-all px-2 py-2 sm:px-4 sm:py-3"
          >
            <CardContent>
              <h3 className="font-medium text-lg mb-1 line-clamp-1">
                {summaries[displayIndex].title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 line-clamp-2 text-sm">
                <ReactMarkdown>{summaries[displayIndex].summary}</ReactMarkdown>
              </p>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {new Date(summaries[displayIndex].createdAt).toLocaleDateString()}
                </span>
                <span>
                  {getSummaryLevelLabel(summaries[displayIndex].summaryLevel, summaries[displayIndex].isEli5)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Overlay right arrow */}
        {showRight && (
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 shadow"
            onClick={() => {
              setSlideDirection('right');
              setCurrentIndex(i => Math.min(summaries.length - 1, i + 1));
            }}
            aria-label="Next summary"
            style={{ transform: 'translateY(-50%)' }}
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>
    </div>
  );
};

export default RecentSummaries;