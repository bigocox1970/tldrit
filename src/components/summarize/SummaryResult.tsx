import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Headphones, Copy } from 'lucide-react';
import { useSummaryStore } from '../../store/summaryStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardFooter } from '../ui/Card';

const SummaryResult: React.FC = () => {
  const { currentSummary, generateAudioForSummary, isLoading } = useSummaryStore();
  const { isAuthenticated, user } = useAuthStore();
  const [copied, setCopied] = React.useState(false);
  
  if (!currentSummary) {
    return null;
  }
  
  const handleGenerateAudio = () => {
    if (currentSummary) {
      generateAudioForSummary(currentSummary.id);
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(currentSummary.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <Card className="mt-8 relative">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-xl font-semibold">Summary</h3>
        <button
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={copied ? 'Copied!' : 'Copy summary'}
          onClick={handleCopy}
        >
          <Copy size={20} />
        </button>
        {copied && (
          <span className="absolute top-2 right-16 px-2 py-1 bg-green-500 text-white text-xs rounded shadow">Copied!</span>
        )}
      </CardHeader>
      
      <CardContent className="prose dark:prose-invert max-w-none">
        <ReactMarkdown>{currentSummary.summary}</ReactMarkdown>
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