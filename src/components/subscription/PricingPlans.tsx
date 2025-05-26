import React from 'react';
import { Check } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardFooter } from '../ui/Card';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Up to 500 words per summary',
      'Basic summarization model',
      'Save up to 10 summaries',
      'Access to news feed (1 category)',
      'Text-to-speech for summaries under 300 words',
    ],
    limitations: [
      'No advanced AI models',
      'Limited summary length',
      'File size limited to 5MB',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    features: [
      'Unlimited words per summary',
      'Access to premium AI models',
      'Unlimited saved summaries',
      'Access to news feed (all categories)',
      'Text-to-speech for all summaries',
      'Priority support',
      'No ads',
      'File size up to 20MB',
    ],
  },
];

const PricingPlans: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  
  const handleUpgrade = (planId: string) => {
    // Implement Stripe integration
    console.log('Upgrade to plan:', planId);
  };
  
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-center mb-8">
        Choose Your Plan
      </h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        {plans.map((plan) => {
          const isCurrentPlan = 
            (plan.id === 'free' && !user?.isPremium) || 
            (plan.id === 'pro' && user?.isPremium);
          
          return (
            <Card 
              key={plan.id} 
              className={`border-2 ${
                plan.id === 'pro' 
                  ? 'border-blue-500 dark:border-blue-400' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <CardHeader className="text-center border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 dark:text-gray-400 ml-1">
                      /month
                    </span>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check size={20} className="text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  
                  {plan.limitations && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">Limitations:</p>
                      <ul className="space-y-2">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-start text-gray-600 dark:text-gray-400">
                            <span className="mr-2">•</span>
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button
                  variant={plan.id === 'pro' ? 'primary' : 'outline'}
                  fullWidth
                  disabled={!isAuthenticated || isCurrentPlan}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrentPlan 
                    ? 'Current Plan' 
                    : plan.id === 'free' 
                      ? 'Downgrade' 
                      : 'Upgrade'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PricingPlans;