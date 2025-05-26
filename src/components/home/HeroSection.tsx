import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';

const HeroSection: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  return (
    <div className="py-8 px-4 sm:px-6 text-center">
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
          <FileText size={32} className="text-white" />
        </div>
      </div>
      
      <h1 className="text-4xl sm:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500 mb-4">
        TLDRit
      </h1>
      
      <p className="text-xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
        AI-powered summaries for articles, documents, and web content.
        Get to the point, faster.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/summarize">
          <Button variant="primary" size="lg">
            Start Summarizing
          </Button>
        </Link>
        
        {!isAuthenticated && (
          <Link to="/register">
            <Button variant="outline" size="lg">
              Create Account
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default HeroSection;