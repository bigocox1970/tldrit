import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Button from '../ui/Button';

const dynamicTexts = [
  'meeting minutes',
  'revision',
  'news',
  'standards',
  'codes of practice',
  'homework',
  'Oh, and ANY webpage!',
];

const HERO_SPECIAL = 'Oh, and ANY webpage!';

const HeroSection: React.FC = () => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  // Animation state for the special step
  const [ohStep, setOhStep] = useState(0); // 0: Oh, 1: dots, 2: reveal rest
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (dynamicTexts[currentTextIndex] === HERO_SPECIAL) {
      if (ohStep === 0) {
        // Add a pause before starting animation
        interval = setTimeout(() => setOhStep(1), 1000);
      } else if (ohStep === 1) {
        // Animate dots: '.', '..', '...'
        if (dotCount < 3) {
          interval = setTimeout(() => setDotCount(dotCount + 1), 250);
        } else {
          // After a pause, reveal the rest
          interval = setTimeout(() => setOhStep(2), 600);
        }
      } else if (ohStep === 2) {
        // After a pause, reset to first text
        interval = setTimeout(() => {
          setCurrentTextIndex(0);
          setOhStep(0);
          setDotCount(1);
        }, 2500);
      }
    } else {
      // Add a pause before dots start animating
      if (dotCount === 1) {
        interval = setTimeout(() => setDotCount(dotCount + 1), 800);
      } else if (dotCount < 3) {
        interval = setTimeout(() => setDotCount(dotCount + 1), 250);
      } else {
        interval = setTimeout(() => {
          setCurrentTextIndex((i) => i + 1);
          setDotCount(1);
        }, 600);
      }
    }
    return () => clearTimeout(interval);
  }, [currentTextIndex, ohStep, dotCount]);

  // Helper for the special animation
  const renderSpecialScroller = () => {
    if (ohStep === 0) {
      return (
        <span>
          <span className="text-gray-900 dark:text-white font-extrabold">Oh,</span>
        </span>
      );
    } else if (ohStep === 1) {
      return (
        <span>
          <span className="text-gray-900 dark:text-white font-extrabold">Oh,</span>
          <span className="inline-block text-gray-900 dark:text-white">{'.'.repeat(dotCount)}</span>
        </span>
      );
    } else {
      // Reveal the rest
      return (
        <span>
          <span className="text-gray-900 dark:text-white font-extrabold">Oh, and </span>
          <span className="text-gray-900 dark:text-white font-extrabold">ANY</span>
          <span> webpage!</span>
        </span>
      );
    }
  };

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
        {dynamicTexts[currentTextIndex] === HERO_SPECIAL ? (
          <span className="inline-block transition-all duration-500 ease-in-out">
            {renderSpecialScroller()}
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-x-2">
            <span className="text-gray-900 dark:text-white font-extrabold">TLDR</span>
            <span className="whitespace-nowrap transition-all duration-500 ease-in-out text-blue-600 dark:text-blue-400">
              {dynamicTexts[currentTextIndex]}<span className="inline-block text-gray-900 dark:text-white">{'.'.repeat(dotCount)}</span>
            </span>
          </div>
        )}
      </h2>
      <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
        Get to the point <span className="text-blue-600 dark:text-blue-400 font-bold">FAST</span>... TLDRit!
      </p>
      <div className="w-full max-w-sm mx-auto flex flex-col gap-4">
        <Link to="/summarize" className="w-full">
          <Button variant="primary" size="lg" className="w-full py-3 text-2xl rounded-md">
            Try it now, its FREE!
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HeroSection;