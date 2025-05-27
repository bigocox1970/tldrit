import React, { useEffect, useState } from 'react';
import HeroSection from '../components/home/HeroSection';
import FeatureSection from '../components/home/FeatureSection';
// import RecentSummaries from '../components/home/RecentSummaries';
// import NewsCarousel from '../components/news/NewsCarousel';
// import { useAuthStore } from '../store/authStore';

const eli5AdCards = [
  {
    tagline: '"explain it like im 5"',
    subtext: 'Understand complex documents, processes and theories with eli5.app',
  },
  {
    tagline: '"Understand Anything. ELI5 Style."',
    subtext: 'Complex Ideas. Simple Words.',
  },
  {
    tagline: '"Knowledge Without the Jargon."',
    subtext: 'Turn Confusion into Clarity.',
  },
  {
    tagline: '"Because Learning Shouldn\'t Be Hard."',
    subtext: 'Revision... easy! Use eli5.app for your studies.',
  },
  {
    tagline: '"Revision Made Easy."',
    subtext: '📘 For Students & Revision',
  },
  {
    tagline: '"Ace Exams with ELI5 Power."',
    subtext: 'Study Smarter, Not Harder.',
  },
  {
    tagline: '"Turn Notes into Nuggets."',
    subtext: 'Your Study Sidekick.',
  },
];

const HomePage: React.FC = () => {
  const [adIndex, setAdIndex] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setAdIndex((i) => (i + 1) % eli5AdCards.length);
        setFade(false);
      }, 400); // fade out, then switch
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const ad = eli5AdCards[adIndex];

  return (
    <div>
      <HeroSection />
      <FeatureSection />
      {/* Removed NewsCarousel and RecentSummaries */}
      {/* Ad Banner for ELI5.app */}
      <div className="w-full flex justify-center mt-8 mb-4">
        <a
          href="https://eli5.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-[728px] max-w-full h-[90px] bg-gradient-to-r from-blue-700 via-pink-500 to-yellow-400 rounded-lg shadow-lg flex flex-col justify-center items-center p-4 border-2 border-blue-300 hover:shadow-xl transition"
          style={{ minHeight: 90 }}
        >
          <div
            style={{
              opacity: fade ? 0 : 1,
              transition: 'opacity 0.4s',
            }}
            key={adIndex}
            className="flex flex-col items-center w-full h-full"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight lowercase">eli5</span>
              <span className="italic text-2xl font-bold text-white lowercase">.app</span>
              <span className="ml-2 text-lg font-semibold text-white">{ad.tagline}</span>
            </div>
            <div className="text-base font-medium text-white mt-1 text-center">
              {ad.subtext}
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

export default HomePage;