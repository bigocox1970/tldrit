import React from 'react';
import { FileText, Newspaper, Headphones, Settings } from 'lucide-react';
import Card, { CardContent } from '../ui/Card';

const features = [
  {
    title: 'Instant Summaries',
    description: 'Get concise summaries of any text, document, or web page with AI precision.',
    icon: FileText,
  },
  {
    title: 'Daily News Feed',
    description: 'Stay updated with AI-generated summaries of the latest news in topics you care about.',
    icon: Newspaper,
  },
  {
    title: 'Audio Playback',
    description: 'Listen to your summaries with natural-sounding text-to-speech technology.',
    icon: Headphones,
  },
  {
    title: 'Customizable Summaries',
    description: 'Adjust summary length and complexity with simple sliders to get exactly what you need.',
    icon: Settings,
  },
];

// Assign a border color for each card from the logo colors
const borderColors = [
  'border-blue-500',
  'border-red-500',
  'border-yellow-400',
  'border-purple-500',
];

const FeatureSection: React.FC = () => {
  return (
    <div className="py-12">
      <h2 className="text-2xl font-bold text-center mb-8">
        Key Features
      </h2>
      
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {features.map((feature, index) => (
          <Card
            key={index}
            className={`border-2 ${borderColors[index % borderColors.length]} aspect-square flex flex-col`}
          >
            <CardContent className="h-full text-left p-4 flex flex-col">
              <div className="w-8 h-8 rounded-lg mb-2 bg-gradient-to-tr from-blue-600 via-red-500 to-yellow-400 flex items-center justify-center">
                <feature.icon size={18} className="text-white" />
              </div>
              <h3 className="font-semibold text-base mb-1 mt-1">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs leading-snug">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FeatureSection;