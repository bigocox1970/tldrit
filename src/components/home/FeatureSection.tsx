import React from 'react';
import { FileText, Newspaper, Headphones, Settings } from 'lucide-react';
import Card, { CardContent } from '../ui/Card';

const features = [
  {
    title: 'Instant Summaries',
    description: 'Get concise summaries of any text, document, or web page with AI precision.',
    icon: FileText,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Daily News Feed',
    description: 'Stay updated with AI-generated summaries of the latest news in topics you care about.',
    icon: Newspaper,
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  },
  {
    title: 'Audio Playback',
    description: 'Listen to your summaries with natural-sounding text-to-speech technology.',
    icon: Headphones,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  },
  {
    title: 'Customizable Summaries',
    description: 'Adjust summary length and complexity with simple sliders to get exactly what you need.',
    icon: Settings,
    color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  },
];

const FeatureSection: React.FC = () => {
  return (
    <div className="py-12">
      <h2 className="text-2xl font-bold text-center mb-8">
        Key Features
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card key={index} className="border border-gray-200 dark:border-gray-700">
            <CardContent className="flex items-start">
              <div className={`p-3 rounded-full mr-4 ${feature.color}`}>
                <feature.icon size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FeatureSection;