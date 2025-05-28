import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Headphones, Copy } from 'lucide-react';
import { useSummaryStore } from '../../store/summaryStore';
import { useAuthStore } from '../../store/authStore';
import Card, { CardContent, CardHeader, CardFooter } from '../ui/Card';

const SummaryResult: React.FC = () => {
  const { currentSummary, generateAudioForSummary, isLoading } = useSummaryStore();
  const { isAuthenticated, user } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  
  if (!currentSummary) {
    return null;
  }
  
  const handleHeadphonesClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSummary) return;
    if (currentSummary.audioUrl) {
      // Play audio
      if (!audioRef.current) {
        audioRef.current = new Audio(currentSummary.audioUrl);
        audioRef.current.addEventListener('ended', () => setAudioPlaying(false));
      }
      if (audioPlaying) {
        audioRef.current.pause();
        setAudioPlaying(false);
      } else {
        audioRef.current.play();
        setAudioPlaying(true);
      }
    } else {
      // Generate audio
      setAudioLoading(true);
      try {
        await generateAudioForSummary(currentSummary.id);
      } finally {
        setAudioLoading(false);
      }
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
          <button
            onClick={handleHeadphonesClick}
            disabled={audioLoading || isLoading || !isAuthenticated || (!user?.isPremium && currentSummary.summary.length > 300)}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${audioLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={currentSummary.audioUrl ? (audioPlaying ? 'Pause audio' : 'Play audio') : (audioLoading ? 'Generating audio...' : 'Generate and play audio')}
          >
            <Headphones size={20} className={audioPlaying ? 'text-green-600 animate-pulse' : currentSummary.audioUrl ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'} />
          </button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SummaryResult;