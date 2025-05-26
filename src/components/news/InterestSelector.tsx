import React, { useEffect } from 'react';
import { useNewsStore } from '../../store/newsStore';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';

const InterestSelector: React.FC = () => {
  const { 
    interests, 
    selectedInterests, 
    fetchAvailableInterests, 
    updateUserInterests,
    isLoading, 
  } = useNewsStore();
  
  useEffect(() => {
    fetchAvailableInterests();
  }, [fetchAvailableInterests]);
  
  const toggleInterest = (interest: string) => {
    const newInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    
    updateUserInterests(newInterests);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <p className="text-center py-4">Loading interests...</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">News Interests</h3>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-2 py-2">
          {interests.map(interest => (
            <Button
              key={interest.id}
              variant={selectedInterests.includes(interest.name) ? 'primary' : 'outline'}
              size="sm"
              onClick={() => toggleInterest(interest.name)}
            >
              {interest.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default InterestSelector;