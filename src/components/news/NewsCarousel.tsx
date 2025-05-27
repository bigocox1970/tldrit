import React, { useEffect, useRef, useState } from 'react';
import { useNewsStore } from '../../store/newsStore';
import Card, { CardContent } from '../ui/Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const NewsCarousel: React.FC = () => {
  const { newsItems, fetchNewsItems, isLoading } = useNewsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    fetchNewsItems();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
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
      if (delta > 50 && currentIndex < newsItems.length - 1) {
        setSlideDirection('right');
        setCurrentIndex(i => Math.min(newsItems.length - 1, i + 1));
      } else if (delta < -50 && currentIndex > 0) {
        setSlideDirection('left');
        setCurrentIndex(i => Math.max(0, i - 1));
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (isLoading && newsItems.length === 0) {
    return (
      <div className="py-8 text-center">
        <p>Loading news...</p>
      </div>
    );
  }

  if (newsItems.length === 0) {
    return null;
  }

  const showLeft = currentIndex > 0;
  const showRight = currentIndex < newsItems.length - 1;
  const news = newsItems[displayIndex];

  return (
    <div className="py-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Latest News</h2>
      </div>
      <div className="relative w-full max-w-2xl mx-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {showLeft && (
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 shadow"
            onClick={() => {
              setSlideDirection('left');
              setCurrentIndex(i => Math.max(0, i - 1));
            }}
            aria-label="Previous news"
            style={{ transform: 'translateY(-50%)' }}
          >
            <ChevronLeft size={32} />
          </button>
        )}
        {/* Card with slide transition */}
        <div
          key={news.id}
          className={`w-full transition-transform duration-300 ease-in-out transform
            ${slideDirection === 'left' ? '-translate-x-full' : ''}
            ${slideDirection === 'right' ? 'translate-x-full' : ''}
            ${!slideDirection ? 'translate-x-0' : ''}
          `}
        >
          <Card className="cursor-pointer hover:border-blue-300 border border-gray-200 dark:border-gray-700 transition-all px-2 py-2 sm:px-4 sm:py-3">
            <CardContent>
              <h3 className="font-medium text-lg mb-1 line-clamp-1">
                {news.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 line-clamp-2 text-sm mb-2">
                {news.summary}
              </p>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {new Date(news.publishedAt).toLocaleDateString()}
                </span>
                <span>
                  {news.category}
                </span>
              </div>
              <a
                href={news.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Read Full Article →
              </a>
            </CardContent>
          </Card>
        </div>
        {showRight && (
          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 shadow"
            onClick={() => {
              setSlideDirection('right');
              setCurrentIndex(i => Math.min(newsItems.length - 1, i + 1));
            }}
            aria-label="Next news"
            style={{ transform: 'translateY(-50%)' }}
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>
    </div>
  );
};

export default NewsCarousel; 