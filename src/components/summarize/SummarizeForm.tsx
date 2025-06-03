import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { File, X, Volume2, Copy } from 'lucide-react';
import { useSummaryStore } from '../../store/summaryStore';
import { useAuthStore } from '../../store/authStore';
import { useAudioStore } from '../../store/audioStore';
import Button from '../ui/Button';
import Toggle from '../ui/Toggle';
import Slider from '../ui/Slider';
import Card, { CardContent } from '../ui/Card';
import ReactMarkdown from 'react-markdown';
import UpgradeModal from '../ui/UpgradeModal';

interface SummarizeFormProps {
  initialContent?: string;
  autoStart?: boolean;
}

// Helper function to detect if input is a URL
const isUrl = (text: string): boolean => {
  const trimmed = text.trim();
  
  // Check for explicit protocol URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return true;
  }
  
  // Check for www. URLs
  if (trimmed.startsWith('www.')) {
    return true;
  }
  
  // Check for domain-like patterns (e.g., google.com, example.org)
  const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.([a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,})([/\w.-]*)*\/?$/;
  
  return domainPattern.test(trimmed);
};

// Helper function to detect if input is ONLY a URL (not embedded in text)
const isOnlyUrl = (text: string): boolean => {
  const trimmed = text.trim();
  
  // Split by whitespace and check if it's just one URL
  const words = trimmed.split(/\s+/);
  
  // If more than one word, it's likely text with embedded URL
  if (words.length > 1) {
    return false;
  }
  
  // If exactly one word, check if it's a URL
  return words.length === 1 && isUrl(words[0]);
};

// Helper function to ensure URL has protocol
const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  if (trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  
  // For domain-only URLs, default to https
  return `https://${trimmed}`;
};

const SummarizeForm: React.FC<SummarizeFormProps> = ({ 
  initialContent = '', 
  autoStart = false
}) => {
  const { createSummary, currentSummary, isLoading, summaries, generateAudioForSummary, loadingStatus } = useSummaryStore();
  const { isAuthenticated, user } = useAuthStore();
  const { currentlyPlaying, isPlaying, toggleAudio } = useAudioStore();
  
  const [content, setContent] = useState(initialContent);
  const [file, setFile] = useState<File | null>(null);
  const [isEli5, setIsEli5] = useState(false);
  const [summaryLevel, setSummaryLevel] = useState(1);
  const [error, setError] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [regenerateHighlight, setRegenerateHighlight] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // Track the last toggled ELI5 value to trigger summary lookup
  const [pendingEli5Toggle, setPendingEli5Toggle] = useState<null | boolean>(null);
  
  // New state for audio and copy functionality
  const [audioLoading, setAudioLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Use user's preferred ELI age from profile
  const eli5Age = user?.eli5Age ?? 5;
  const eli5Label = isEli5 ? `ELI${eli5Age}` : 'ELI5';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load file from sessionStorage if present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const type = searchParams.get('type');
    
    if (type === 'file') {
      const storedFileData = sessionStorage.getItem('tldrTempFormData');
      const tempFile = window.__tldrTempFile;
      
      if (storedFileData && tempFile) {
        try {
          const fileData = JSON.parse(storedFileData);
          // Verify the file matches the stored data
          if (fileData.name === tempFile.name && 
              fileData.size === tempFile.size && 
              fileData.lastModified === tempFile.lastModified) {
            setFile(tempFile);
          }
          // Clean up
          sessionStorage.removeItem('tldrTempFormData');
          delete window.__tldrTempFile;
        } catch (error) {
          console.error('Error loading file from storage:', error);
        }
      }
    }
  }, []);

  // Track if we've already auto-started
  const [hasAutoStarted, setHasAutoStarted] = useState(false);

  // Auto-start summary generation if requested (only once)
  useEffect(() => {
    if (autoStart && isAuthenticated && !isLoading && !hasAutoStarted) {
      // Small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        if (content || file) {
          // Create a function to auto-submit without needing an event
          autoSubmit();
          setHasAutoStarted(true);
          
          // Remove autoStart from URL to prevent re-triggering
          const url = new URL(window.location.href);
          url.searchParams.delete('autoStart');
          window.history.replaceState({}, '', url.toString());
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, isAuthenticated, content, file, isLoading, hasAutoStarted]);

  // Function to handle auto-submission without an event
  const autoSubmit = async () => {
    setError('');
    
    if (!isAuthenticated) {
      setError('You must be signed in to create summaries');
      return;
    }
    
    // Clear the current summary before starting a new one
    useSummaryStore.setState({ currentSummary: null });
    setShowOverlay(true);
    
    try {
      if (!content.trim() && !file) {
        setError('Please enter some text, a URL, or upload a file to summarize');
        return;
      }
      
      // Check word count limits based on plan for text content
      if (content.trim()) {
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        const planLimits = {
          free: 1000,
          pro: 10000,
          premium: Infinity
        };
        
        const userPlan = user?.plan || 'free';
        const wordLimit = planLimits[userPlan as keyof typeof planLimits];
        
        if (wordLimit !== Infinity && wordCount > wordLimit) {
          setError(`${userPlan === 'free' ? 'Free' : 'Pro'} accounts are limited to ${wordLimit.toLocaleString()} words per document. Upgrade to process longer content.`);
          setShowUpgradeModal(true);
          return;
        }
      }
      
      // Determine content type automatically
      let contentType: 'text' | 'url' | 'file';
      let processedContent: string | File;
      
      if (file) {
        contentType = 'file';
        processedContent = file;
      } else if (isOnlyUrl(content)) {
        contentType = 'url';
        processedContent = normalizeUrl(content);
      } else {
        contentType = 'text';
        processedContent = content;
      }
      
      await createSummary({
        content: processedContent,
        contentType,
        summaryLevel,
        isEli5,
      });
    } catch {
      setError('An error occurred while creating the summary');
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isAuthenticated) {
      setError('You must be signed in to create summaries');
      return;
    }
    
    // Clear the current summary before starting a new one
    useSummaryStore.setState({ currentSummary: null });
    setShowOverlay(true);
    
    try {
      if (!content.trim() && !file) {
        setError('Please enter some text, a URL, or upload a file to summarize');
        return;
      }
      
      // Check word count limits based on plan for text content
      if (content.trim()) {
        const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
        const planLimits = {
          free: 1000,
          pro: 10000,
          premium: Infinity
        };
        
        const userPlan = user?.plan || 'free';
        const wordLimit = planLimits[userPlan as keyof typeof planLimits];
        
        if (wordLimit !== Infinity && wordCount > wordLimit) {
          setError(`${userPlan === 'free' ? 'Free' : 'Pro'} accounts are limited to ${wordLimit.toLocaleString()} words per document. Upgrade to process longer content.`);
          setShowUpgradeModal(true);
          return;
        }
      }
      
      // Determine content type automatically
      let contentType: 'text' | 'url' | 'file';
      let processedContent: string | File;
      
      if (file) {
        contentType = 'file';
        processedContent = file;
      } else if (isOnlyUrl(content)) {
        contentType = 'url';
        processedContent = normalizeUrl(content);
      } else {
        contentType = 'text';
        processedContent = content;
      }
      
      await createSummary({
        content: processedContent,
        contentType,
        summaryLevel,
        isEli5,
      });
    } catch {
      setError('An error occurred while creating the summary');
    }
  };
  
  const handleRegenerateTLDR = async (eli5 = isEli5, level = summaryLevel) => {
    // Check for existing TL;DR in history
    const match = summaries.find(tldr => {
      let key;
      if (file) {
        key = file.name;
      } else if (isOnlyUrl(content)) {
        key = normalizeUrl(content);
      } else {
        key = content;
      }
      return (
        tldr.originalContent === key &&
        tldr.summaryLevel === level &&
        tldr.isEli5 === eli5
      );
    });
    if (match) {
      useSummaryStore.setState({ currentSummary: match });
      setRegenerateHighlight(false);
      return;
    }
    try {
      // Determine content type automatically
      let contentType: 'text' | 'url' | 'file';
      let processedContent: string | File;
      
      if (file) {
        contentType = 'file';
        processedContent = file;
      } else if (isOnlyUrl(content)) {
        contentType = 'url';
        processedContent = normalizeUrl(content);
      } else {
        contentType = 'text';
        processedContent = content;
      }
      
      await createSummary({
        content: processedContent,
        contentType,
        summaryLevel: level,
        isEli5: eli5,
        eli5Level: eli5 ? eli5Age : undefined,
      });
      setRegenerateHighlight(false);
    } catch {
      setError('An error occurred while regenerating the TL;DR');
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file size limit - generous 20MB for all plans to avoid confusion
      const fileSizeLimit = 20 * 1024 * 1024; // 20MB for all plans
      
      if (selectedFile.size > fileSizeLimit) {
        setError('File size must be under 20MB. Please choose a smaller file.');
        return;
      }
      
      setFile(selectedFile);
      setContent(''); // Clear text content when file is selected
      setError('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      
      // Check file type
      const allowedTypes = ['.txt', '.pdf', '.doc', '.docx'];
      const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('Please upload a valid file type: PDF, DOCX, or TXT');
        return;
      }
      
      // Check file size limit - generous 20MB for all plans to avoid confusion
      const fileSizeLimit = 20 * 1024 * 1024; // 20MB for all plans
      
      if (selectedFile.size > fileSizeLimit) {
        setError('File size must be under 20MB. Please choose a smaller file.');
        return;
      }
      
      setFile(selectedFile);
      setContent(''); // Clear text content when file is dropped
      setError('');
    }
  };
  
  const handleSliderChange = (level: number) => {
    setSummaryLevel(level);
    setRegenerateHighlight(true);
  };
  
  useEffect(() => {
    if (pendingEli5Toggle === null) return;
    let key;
    if (file) {
      key = file.name;
    } else if (isOnlyUrl(content)) {
      key = normalizeUrl(content);
    } else {
      key = content;
    }
    if (!pendingEli5Toggle) {
      // Toggling ELI off: try to load standard TL;DR from history
      const match = summaries.find(tldr =>
        tldr.originalContent === key &&
        tldr.summaryLevel === summaryLevel &&
        tldr.isEli5 === false
      );
      if (match) {
        useSummaryStore.setState({ currentSummary: match });
        setShowOverlay(true);
        setRegenerateHighlight(false);
      }
    } else {
      // Toggling ELI on: try to load ELI TL;DR from history
      const match = summaries.find(tldr =>
        tldr.originalContent === key &&
        tldr.summaryLevel === summaryLevel &&
        tldr.isEli5 === true
      );
      if (match) {
        useSummaryStore.setState({ currentSummary: match });
        setShowOverlay(true);
        setRegenerateHighlight(false);
      }
    }
    setPendingEli5Toggle(null);
  }, [pendingEli5Toggle, summaries, content, file, summaryLevel, useSummaryStore]);

  const handleEli5Toggle = () => {
    setIsEli5((prev) => {
      const newVal = !prev;
      setRegenerateHighlight(true);
      setPendingEli5Toggle(newVal);
      return newVal;
    });
  };
  
  const handleSpeakerClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSummary) return;

    // Check if user has access to TTS
    if (user?.plan === 'free') {
      setShowUpgradeModal(true);
      return;
    }

    if (currentSummary.audioUrl) {
      // Use global audio store to handle playback
      toggleAudio(currentSummary.id, currentSummary.audioUrl);
    } else {
      // Generate audio
      setAudioLoading(true);
      try {
        await generateAudioForSummary(currentSummary.id);
      } catch (error) {
        console.error('Error generating audio:', error);
        // Show error modal for character limit
        if (error instanceof Error && error.message.includes('700 characters')) {
          setError('Audio is only available for summaries up to 700 characters on the free plan. Upgrade to Pro for longer audio.');
        }
      } finally {
        setAudioLoading(false);
      }
    }
  };

  const handleCopy = () => {
    if (!currentSummary) return;
    navigator.clipboard.writeText(currentSummary.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <Card>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {!isAuthenticated && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
              <p>
                <Link to="/login" className="font-medium hover:underline">
                  Sign in
                </Link>{' '}
                or{' '}
                <Link to="/register" className="font-medium hover:underline">
                  create a FREE account
                </Link>{' '}
                to use the TLDR feature.
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-[70vh] min-h-[400px]">
            <div className="flex-1 flex flex-col min-h-0">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => {
                  setContent(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                  }
                }}
                className="w-full flex-1 p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-auto min-h-[120px] max-h-none"
                style={{ minHeight: '120px', height: '100%', maxHeight: 'none' }}
                placeholder={`Paste your text or enter a URL to TLDRit!

📝 Text: Meeting notes, articles, documents, etc.
🌐 URLs: Any webpage (we'll extract the content)
📄 Files: Drop files below

Any URL type: example.com, www.example.com, https://example.com
• Your long meeting transcript
• Research paper content`}
                disabled={!!file} // Disable when file is selected
              />
            </div>
            {/* Always show drop file card below input */}
            <div className="mt-4 flex-1 flex flex-col justify-end">
              <div 
                className={`border-4 border-dashed rounded-2xl p-8 text-center transition-colors shadow-lg bg-white/70 dark:bg-gray-900/70 ${
                  isDragOver 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ minHeight: '120px' }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".txt,.pdf,.doc,.docx"
                />
                {file ? (
                  <div>
                    <p className="mb-2 text-lg text-gray-600 dark:text-gray-400">
                      Selected file:
                    </p>
                    <p className="font-medium text-lg">{file.name}</p>
                    <button
                      type="button"
                      onClick={() => { setFile(null); setContent(''); }}
                      className="mt-2 text-base text-red-600 dark:text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer block"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <File size={48} className={`mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                      <p className={`text-2xl font-semibold mb-2 ${isDragOver ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                        {isDragOver ? 'Drop file here!' : 'Drop file here or click to upload'}
                      </p>
                      <p className="text-base text-gray-500 dark:text-gray-400">
                        Supports PDF, DOCX, TXT (max 20MB)
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading || (!content && !file)}
            >
              {isLoading ? (loadingStatus || 'Summarizing...') : 'TL;DR it!'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Summary Overlay */}
      {showOverlay && (
        <div className="absolute left-0 right-0 top-0 z-50 flex justify-center bg-black bg-opacity-50" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col relative mt-4" style={{ zIndex: 100 }}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Summary</h3>
              <div className="flex items-center space-x-2">
                {currentSummary && (
                  <>
                    {/* Copy Button */}
                    <div className="relative">
                      <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        title={copied ? 'Copied!' : 'Copy summary'}
                      >
                        <Copy size={20} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      {copied && (
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-green-500 text-white text-xs rounded shadow-lg whitespace-nowrap">
                          Copied!
                        </span>
                      )}
                    </div>

                    {/* Speaker Button */}
                    <button
                      onClick={handleSpeakerClick}
                      disabled={audioLoading}
                      className={`p-2 rounded-full transition-colors ${
                        audioLoading 
                          ? 'animate-pulse bg-green-200 dark:bg-green-800'
                          : currentlyPlaying === currentSummary.id && isPlaying
                          ? 'bg-green-600 hover:bg-green-700'
                          : currentSummary.audioUrl
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={
                        audioLoading
                          ? 'Generating audio...'
                          : currentlyPlaying === currentSummary.id && isPlaying
                          ? 'Pause audio'
                          : currentSummary.audioUrl
                          ? 'Play audio'
                          : user?.isPremium
                          ? 'Generate audio'
                          : 'Upgrade to Pro for audio'
                      }
                    >
                      <Volume2
                        size={20}
                        className={
                          audioLoading
                            ? 'text-green-700 dark:text-green-300'
                            : currentlyPlaying === currentSummary.id && isPlaying
                            ? 'text-white animate-pulse'
                            : currentSummary.audioUrl
                            ? 'text-white'
                            : 'text-gray-600 dark:text-gray-400'
                        }
                      />
                    </button>
                  </>
                )}
                
                {/* Close Button */}
                <button
                  onClick={() => setShowOverlay(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {currentSummary ? (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown>{currentSummary.summary}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-lg text-gray-500">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p>{loadingStatus || 'Generating summary...'}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Length
                </label>
                <Slider
                  min={1}
                  max={3}
                  value={summaryLevel}
                  onChange={handleSliderChange}
                  labels={['Short', 'Long', 'Full']}
                />
              </div>
              <div className="inline-flex items-center">
                <Toggle
                  isOn={isEli5}
                  onToggle={handleEli5Toggle}
                  rightLabel={eli5Label}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowOverlay(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleRegenerateTLDR()}
                  disabled={isLoading}
                  className={regenerateHighlight ? 'animate-pulse ring-2 ring-blue-400' : ''}
                >
                  {isLoading ? (loadingStatus || 'Regenerating...') : 'Regenerate'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
};

export default SummarizeForm;
