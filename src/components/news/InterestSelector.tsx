import React, { useEffect, useState } from 'react';
import { useNewsStore } from '../../store/newsStore';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const InterestSelector: React.FC = () => {
  const { 
    interests, 
    selectedInterests, 
    fetchAvailableInterests, 
    updateUserInterests,
    isLoading, 
  } = useNewsStore();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetchAvailableInterests();
  }, [fetchAvailableInterests]);

  const toggleInterest = (interest: string) => {
    const newInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    updateUserInterests(newInterests);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchAvailableInterests();
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
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpen(!open)}>
            <span className="text-lg font-semibold">Interests</span>
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 ml-2"
            title="Refresh Interests"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </CardHeader>
      {open && (
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
      )}
    </Card>
  );
};

export default InterestSelector;