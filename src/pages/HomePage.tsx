import React from 'react';
import HeroSection from '../components/home/HeroSection';
import FeatureSection from '../components/home/FeatureSection';
// import RecentSummaries from '../components/home/RecentSummaries';
// import NewsCarousel from '../components/news/NewsCarousel';
// import { useAuthStore } from '../store/authStore';

const HomePage: React.FC = () => {
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
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">ELI5</span>
            <span className="italic text-2xl font-bold text-white">.app</span>
            <span className="ml-2 text-lg font-semibold text-white">Explain it like im 5!</span>
          </div>
          <div className="text-base font-medium text-white mt-1 text-center">
            Understand complex documents, processes and theories with <span className="font-bold">eli5.app</span>
          </div>
        </a>
      </div>
    </div>
  );
};

export default HomePage;