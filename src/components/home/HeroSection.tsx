import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

const dynamicTexts = [
  'meeting minutes',
  'revision',
  'news',
  'standards',
  'codes of practice',
  'homework',
  'Oh, and ANY webpage!',
];

const HeroSection: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (dynamicTexts[currentTextIndex] === 'Oh, and ANY webpage!') {
      interval = setTimeout(() => {
        setCurrentTextIndex(0);
      }, 3500);
    } else {
      interval = setTimeout(() => {
        setCurrentTextIndex((i) => i + 1);
      }, 1800);
    }
    return () => clearTimeout(interval);
  }, [currentTextIndex]);

  return (
    <div className="py-2 px-4 sm:px-6 text-center flex flex-col items-center justify-center min-h-[40vh]">
      <div className="flex justify-center">
        <div className="h-20 w-20 bg-gradient-to-tr from-blue-600 via-red-500 to-yellow-400 rounded-full flex items-center justify-center shadow-lg ring-4 ring-blue-200 dark:ring-blue-900 mb-1">
          <FileText size={48} className="text-white drop-shadow-lg" />
        </div>
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500 mb-2">
        Fast AI powered summaries
      </h1>
      <h2 className="text-3xl sm:text-4xl font-bold mb-4 min-h-[2.5em]">
        {dynamicTexts[currentTextIndex] === 'Oh, and ANY webpage!' ? (
          <span className="inline-block transition-all duration-500 ease-in-out font-extrabold bg-gradient-to-r from-pink-500 via-yellow-400 to-blue-500 bg-clip-text text-transparent">
            {dynamicTexts[currentTextIndex]}
          </span>
        ) : (
          <>
            TLDR{' '}
            <span className="inline-block transition-all duration-500 ease-in-out text-blue-600 dark:text-blue-400">
              {dynamicTexts[currentTextIndex]}
            </span>
            ...
          </>
        )}
      </h2>
      <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
        Get to the point <span className="text-blue-600 dark:text-blue-400 font-bold">FAST</span>... TLDRit!
      </p>
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <Link to="/summarize" className="w-full">
          <Button variant="primary" size="lg" className="w-full py-3 text-2xl rounded-md">
            Get Started
          </Button>
        </Link>
        {!isAuthenticated && (
          <Link to="/register" className="w-full">
            <Button variant="outline" size="lg" className="w-full py-3 text-2xl rounded-md">
              Create Account
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default HeroSection;