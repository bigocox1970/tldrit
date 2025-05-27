import React from 'react';
import HeroSection from '../components/home/HeroSection';
import FeatureSection from '../components/home/FeatureSection';
import RecentSummaries from '../components/home/RecentSummaries';
import NewsCarousel from '../components/news/NewsCarousel';
import { useAuthStore } from '../store/authStore';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  return (
    <div>
      <HeroSection />
      <NewsCarousel />
      {isAuthenticated && <RecentSummaries />}
      <FeatureSection />
    </div>
  );
};

export default HomePage;