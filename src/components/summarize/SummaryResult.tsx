import React from 'react';
import { Headphones, Save } from 'lucide-react';
import { useSummaryStore } from '../../store/summaryStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardFooter } from '../ui/Card';

const SummaryResult: React.FC = () => {
  const { currentSummary, generateAudioForSummary, isLoading } = useSummaryStore();
  const { isAuthenticated, user } = useAuthStore();
  
  if (!currentSummary) {
    return null;
  }
  
  const handleGenerateAudio = () => {
    if (currentSummary) {
      generateAudioForSummary(currentSummary.id);
    }
  };
  
  return (
    <Card className="mt-8">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold">Summary</h3>
      </CardHeader>
      
      <CardContent className="prose dark:prose-invert max-w-none">
        <p className="whitespace-pre-line">{currentSummary.summary}</p>
      </CardContent>
      
      <CardFooter className="border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {currentSummary.isEli5 ? 'ELI5 Summary' : `Level ${currentSummary.summaryLevel} Summary`}
        </div>
        
        <div className="flex space-x-2">
          {!currentSummary.audioUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAudio}
              disabled={isLoading || !isAuthenticated || (!user?.isPremium && currentSummary.summary.length > 300)}
            >
              <Headphones size={16} className="mr-1" />
              {isLoading ? 'Generating...' : 'Generate Audio'}
            </Button>
          )}
          
          {currentSummary.audioUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(currentSummary.audioUrl, '_blank')}
            >
              <Headphones size={16} className="mr-1" />
              Listen
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default SummaryResult;