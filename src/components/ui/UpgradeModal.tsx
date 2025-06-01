import React from 'react';
import { X, Crown, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen, 
  onClose, 
  feature = 'text-to-speech audio'
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    navigate('/pricing');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X size={20} className="text-gray-500 dark:text-gray-400" />
        </button>

        <div className="p-6 text-center">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Crown size={28} className="text-white" />
          </div>

          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Upgrade to Pro
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please upgrade to a Pro account to access {feature}
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-3">
              <Volume2 size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Pro Features Include:
              </span>
            </div>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Text-to-speech (100,000 words/month)</li>
              <li>• 100 TLDRs per month (vs 10 free)</li>
              <li>• Process up to 10,000 words (vs 1,000 free)</li>
              <li>• Save up to 100 TLDRs (vs 1 free)</li>
              <li>• Unlimited news categories</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              variant="primary"
              onClick={handleUpgrade}
              className="flex-1"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal; 