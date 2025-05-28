import React, { useEffect, useRef, useState } from 'react';
import { useNewsStore } from '../../store/newsStore';
import Card, { CardContent } from '../ui/Card';
import { ChevronLeft, ChevronRight, FileText, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const NewsCarousel: React.FC = () => {
  const { newsItems, fetchNewsItems, isLoading, generateTLDRForNewsItem } = useNewsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const [tldrVisible, setTldrVisible] = useState<{ [id: string]: boolean }>({});

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
              <div className="flex items-center gap-4">
                {news.imageUrl && (
                  <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-gray-100">
                    <img
                      src={news.imageUrl}
                      alt={news.title}
                      className="w-full h-full object-cover"
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
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
                  <button
                    className="mt-2 flex items-center gap-1 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!news.tldr) {
                        await generateTLDRForNewsItem(news.id);
                      }
                      setTldrVisible(v => ({ ...v, [news.id]: !v[news.id] }));
                    }}
                  >
                    <FileText size={16} /> TLDR
                  </button>
                  {tldrVisible[news.id] && news.tldr && (
                    <div className="relative mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 prose prose-blue max-w-none dark:prose-invert">
                      {/* Copy feedback state */}
                      {(() => {
                        const [copied, setCopied] = useState(false);
                        const handleCopy = (e: React.MouseEvent) => {
                          e.stopPropagation();
                          if (news.tldr) {
                            navigator.clipboard.writeText(news.tldr);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          }
                        };
                        return (
                          <>
                            <button
                              className="absolute top-0 right-0 p-2 m-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title={copied ? 'Copied!' : 'Copy TLDR'}
                              onClick={handleCopy}
                            >
                              <Copy size={18} />
                            </button>
                            {copied && (
                              <span className="absolute top-0 right-12 mt-2 px-2 py-1 bg-green-500 text-white text-xs rounded shadow">Copied!</span>
                            )}
                          </>
                        );
                      })()}
                      <ReactMarkdown>{news.tldr}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
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