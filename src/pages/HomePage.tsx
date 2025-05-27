import React, { useEffect, useState } from 'react';
import HeroSection from '../components/home/HeroSection';
import FeatureSection from '../components/home/FeatureSection';
import { Smartphone, BookOpen, Lightbulb, GraduationCap, FileText, User } from 'lucide-react';
// import RecentSummaries from '../components/home/RecentSummaries';
// import NewsCarousel from '../components/news/NewsCarousel';
// import { useAuthStore } from '../store/authStore';

const eli5AdCards = [
  {
    tagline: '"explain it like im 5"',
    subtext: 'Understand anything with eli5.app',
    icon: Lightbulb,
  },
  {
    tagline: '"Understand Anything. ELI5 Style."',
    subtext: 'Simple words for complex ideas.',
    icon: Lightbulb,
  },
  {
    tagline: '"No More Jargon."',
    subtext: 'Turn confusion into clarity.',
    icon: FileText,
  },
  {
    tagline: '"Learning Shouldn\'t Be Hard."',
    subtext: 'Revision made easy with eli5.app.',
    icon: BookOpen,
  },
  {
    tagline: '"Revision Made Easy."',
    subtext: 'For students & revision.',
    icon: BookOpen,
  },
  {
    tagline: '"Ace Exams with ELI5."',
    subtext: 'Study smarter, not harder.',
    icon: GraduationCap,
  },
  {
    tagline: '"Turn Notes into Nuggets."',
    subtext: 'Your study sidekick.',
    icon: User,
  },
  {
    tagline: '"eli5.app on your phone"',
    subtext: 'Use it anywhere, anytime!',
    icon: Smartphone,
  },
];

const FLIP_DURATION = 600; // ms
const INTERVAL = 10000; // ms

const HomePage: React.FC = () => {
  const [adIndex, setAdIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setShowBack(true); // show back side (next card)
      }, FLIP_DURATION / 2);
      setTimeout(() => {
        setAdIndex((i) => (i + 1) % eli5AdCards.length);
        setShowBack(false); // return to front side (new card)
        setIsFlipping(false);
      }, FLIP_DURATION);
    }, INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const ad = eli5AdCards[adIndex];
  const nextAd = eli5AdCards[(adIndex + 1) % eli5AdCards.length];
  const Icon = ad.icon;
  const NextIcon = nextAd.icon;

  return (
    <div>
      <HeroSection />
      <FeatureSection />
      {/* Removed NewsCarousel and RecentSummaries */}
      {/* Ad Banner for ELI5.app with 3D flip animation */}
      <div className="w-full flex justify-center mt-8 mb-4">
        <a
          href="https://eli5.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-[728px] max-w-full h-[90px] overflow-hidden bg-gradient-to-r from-blue-700 via-pink-500 to-yellow-400 rounded-lg shadow-lg flex items-center justify-center border-2 border-blue-300 hover:shadow-xl transition px-8 py-4"
          style={{ minHeight: 90 }}
        >
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{ perspective: '1200px' }}
          >
            <div
              className="absolute w-full h-full flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
                transition: `transform ${FLIP_DURATION}ms cubic-bezier(0.4,0.2,0.2,1)`,
                transform: isFlipping ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front Side */}
              <div
                className={`w-full h-full flex items-center justify-center backface-hidden transition-opacity duration-300 ${!showBack ? 'opacity-100' : 'opacity-0'}`}
                style={{ backfaceVisibility: 'hidden', position: 'absolute', top: 0, left: 0 }}
              >
                <Icon size={34} className="text-white drop-shadow-md mr-4" />
                <div className="flex flex-col items-start justify-center leading-tight overflow-hidden max-h-full w-full">
                  <div className="flex items-baseline gap-2 leading-tight w-full flex-wrap">
                    <span className="text-2xl sm:text-2xl font-extrabold text-white tracking-tight lowercase line-clamp-2">eli5</span>
                    <span className="italic text-xl sm:text-xl font-bold text-white lowercase line-clamp-2">.app</span>
                    <span className="ml-2 text-base sm:text-base font-semibold text-white whitespace-normal line-clamp-2">{ad.tagline}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-white mt-1 text-left leading-tight line-clamp-2 w-full">
                    {ad.subtext}
                  </div>
                </div>
              </div>
              {/* Back Side (next card) */}
              <div
                className={`w-full h-full flex items-center justify-center backface-hidden transition-opacity duration-300 ${showBack ? 'opacity-100' : 'opacity-0'}`}
                style={{
                  backfaceVisibility: 'hidden',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: 'rotateY(180deg)',
                }}
              >
                <NextIcon size={34} className="text-white drop-shadow-md mr-4" />
                <div className="flex flex-col items-start justify-center leading-tight overflow-hidden max-h-full w-full">
                  <div className="flex items-baseline gap-2 leading-tight w-full flex-wrap">
                    <span className="text-2xl sm:text-2xl font-extrabold text-white tracking-tight lowercase line-clamp-2">eli5</span>
                    <span className="italic text-xl sm:text-xl font-bold text-white lowercase line-clamp-2">.app</span>
                    <span className="ml-2 text-base sm:text-base font-semibold text-white whitespace-normal line-clamp-2">{nextAd.tagline}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-white mt-1 text-left leading-tight line-clamp-2 w-full">
                    {nextAd.subtext}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

export default HomePage;