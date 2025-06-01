import React from 'react';
import { X, Headphones, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

interface NoAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType?: 'TLDR' | 'news';
}

const NoAudioModal: React.FC<NoAudioModalProps> = ({ 
  isOpen, 
  onClose, 
  itemType = 'TLDR'
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGoToSaved = () => {
    navigate('/saved');
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
          <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-orange-600 dark:text-orange-400" />
          </div>

          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            No Audio Available
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please generate audio for this {itemType} first before adding it to your listen playlist.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-3">
              <Headphones size={20} className="text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                How to generate audio:
              </span>
            </div>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• You must have a Pro or Premium account to use text-to-speech</li>
              <li>• Click the speaker icon on your {itemType}</li>
              <li>• Once audio is generated, you can add it to your playlist</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleGoToSaved}
              className="flex-1"
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoAudioModal; 