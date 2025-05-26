import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { File, Link as LinkIcon, Text, X } from 'lucide-react';
import { useSummaryStore } from '../../store/summaryStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Toggle from '../ui/Toggle';
import Slider from '../ui/Slider';
import Card, { CardContent } from '../ui/Card';

const SummarizeForm: React.FC = () => {
  const { createSummary, currentSummary, isLoading, summaries } = useSummaryStore();
  const { isAuthenticated, user } = useAuthStore();
  
  const [inputType, setInputType] = useState<'text' | 'url' | 'file'>('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isEli5, setIsEli5] = useState(false);
  const [summaryLevel, setSummaryLevel] = useState(2);
  const [error, setError] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [regenerateHighlight, setRegenerateHighlight] = useState(false);
  // Track the last toggled ELI5 value to trigger summary lookup
  const [pendingEli5Toggle, setPendingEli5Toggle] = useState<null | boolean>(null);
  
  // Use user's preferred ELI age from profile
  const eli5Age = user?.eli5Age ?? 5;
  const eli5Label = isEli5 ? `ELI${eli5Age}` : 'ELI5';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    
    try {
      if (inputType === 'text' && !content.trim()) {
        setError('Please enter some text to summarize');
        return;
      }
      
      if (inputType === 'url' && !content.trim()) {
        setError('Please enter a URL to summarize');
        return;
      }
      
      if (inputType === 'file' && !file) {
        setError('Please upload a file to summarize');
        return;
      }
      
      if (!user?.isPremium) {
        const wordCount = content.split(/\s+/).length;
        if (wordCount > 500) {
          setError('Free accounts are limited to 500 words. Upgrade to summarize longer content.');
          return;
        }
      }
      
      await createSummary({
        content: inputType === 'file' ? file as unknown as string : content,
        contentType: inputType,
        summaryLevel,
        isEli5,
      });
      
      setShowOverlay(true);
    } catch {
      setError('An error occurred while creating the summary');
    }
  };
  
  const handleRegenerateTLDR = async (eli5 = isEli5, level = summaryLevel) => {
    // Check for existing TL;DR in history
    const match = summaries.find(tldr => {
      let key;
      if (inputType === 'url') key = content;
      else if (inputType === 'file') key = file?.name;
      else key = content;
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
      await createSummary({
        content: inputType === 'file' ? file as unknown as string : content,
        contentType: inputType,
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
      
      if (!user?.isPremium && selectedFile.size > 5 * 1024 * 1024) {
        setError('Free accounts are limited to 5MB files. Upgrade to process larger files.');
        return;
      }
      
      setFile(selectedFile);
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
    if (inputType === 'url') key = content;
    else if (inputType === 'file') key = file?.name;
    else key = content;
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
  }, [pendingEli5Toggle, summaries, inputType, content, file, summaryLevel, useSummaryStore]);

  const handleEli5Toggle = () => {
    setIsEli5((prev) => {
      const newVal = !prev;
      setRegenerateHighlight(true);
      setPendingEli5Toggle(newVal);
      return newVal;
    });
  };
  
  const renderInputField = () => {
    switch (inputType) {
      case 'text':
        return (
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
            className="w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-auto"
            placeholder="Paste your text here..."
          />
        );
      case 'url':
        return (
          <Input
            type="url"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter URL to summarize..."
          />
        );
      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileChange}
              className="hidden"
              accept=".txt,.pdf,.doc,.docx"
            />
            
            {file ? (
              <div>
                <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected file:
                </p>
                <p className="font-medium">{file.name}</p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center">
                  <File size={36} className="text-gray-400 mb-2" />
                  <p className="text-lg font-medium mb-1">Drop file here or click to upload</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Supports PDF, DOCX, TXT (max {user?.isPremium ? '20MB' : '5MB'})
                  </p>
                </div>
              </label>
            )}
          </div>
        );
      default:
        return null;
    }
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
                  create an account
                </Link>{' '}
                to save your summaries and access premium features.
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setInputType('text')}
                className={`flex-1 py-2 ${
                  inputType === 'text'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center">
                  <Text size={16} className="mr-2" />
                  <span>Text</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setInputType('url')}
                className={`flex-1 py-2 ${
                  inputType === 'url'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center">
                  <LinkIcon size={16} className="mr-2" />
                  <span>URL</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setInputType('file')}
                className={`flex-1 py-2 ${
                  inputType === 'file'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center">
                  <File size={16} className="mr-2" />
                  <span>File</span>
                </div>
              </button>
            </div>
            
            <div>
              {renderInputField()}
            </div>
            
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading || (!content && !file)}
            >
              {isLoading ? 'Summarizing...' : 'TL;DR it!'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Summary Overlay */}
      {showOverlay && currentSummary && (
        <div className="absolute left-0 right-0 top-0 z-50 flex justify-center bg-black bg-opacity-50" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col relative mt-4" style={{ zIndex: 100 }}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold">Summary</h3>
              <button
                onClick={() => setShowOverlay(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <p className="whitespace-pre-line">{currentSummary.summary}</p>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary Length
                </label>
                <Slider
                  min={1}
                  max={4}
                  value={summaryLevel}
                  onChange={handleSliderChange}
                  labels={['Title + 1 line', 'Short', 'Long', 'Full']}
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
                  {isLoading ? 'Regenerating...' : 'Regenerate'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SummarizeForm;