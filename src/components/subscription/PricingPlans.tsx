import React from 'react';
import { Check, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader, CardFooter } from '../ui/Card';
import Tooltip from '../ui/Tooltip';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceDisplay: 'Free',
    highlight: false,
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4.99,
    priceDisplay: '£4.99',
    highlight: true,
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    priceDisplay: '£9.99',
    highlight: false,
    popular: false,
  },
];

const features = [
  {
    label: 'Words per document',
    free: true,
    freeValue: '1,000',
    pro: true,
    proValue: '10,000',
    premium: true,
    premiumValue: 'Unlimited',
  },
  {
    label: 'TLDRs per month',
    free: true,
    freeValue: '10',
    pro: true,
    proValue: '100',
    premium: true,
    premiumValue: '* Unlimited',
  },
  {
    label: 'Saved TLDRs',
    free: true,
    freeValue: '1',
    pro: true,
    proValue: '100',
    premium: true,
    premiumValue: 'Unlimited',
  },
  {
    label: 'News feed categories',
    free: true,
    freeValue: '1',
    pro: true,
    proValue: 'Unlimited',
    premium: true,
    premiumValue: 'Unlimited',
  },
  {
    label: 'Text-to-speech for TLDRs',
    free: false,
    freeValue: null,
    pro: true,
    proValue: '100,000 words/mo',
    premium: true,
    premiumValue: '* Unlimited',
  },
  {
    label: 'Free TLDRs on news feeds',
    free: true,
    freeValue: null,
    pro: true,
    proValue: null,
    premium: true,
    premiumValue: null,
  },
  {
    label: 'Free TTS on news feeds',
    free: true,
    freeValue: null,
    pro: true,
    proValue: null,
    premium: true,
    premiumValue: null,
  },
  {
    label: 'Download TLDR options',
    free: true,
    freeValue: null,
    pro: true,
    proValue: null,
    premium: true,
    premiumValue: null,
  },
  {
    label: 'Save as PDF, DOCX, MD',
    free: true,
    freeValue: null,
    pro: true,
    proValue: null,
    premium: true,
    premiumValue: null,
  },
  {
    label: 'Ad-free experience',
    free: false,
    freeValue: null,
    pro: false,
    proValue: null,
    premium: true,
    premiumValue: null,
  },
];

const PricingPlans: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  const handleUpgrade = (planId: string) => {
    // Implement Stripe integration
    console.log('Upgrade to plan:', planId);
  };

  const getFeatureDisplay = (planId: string, feature: {
    label: string;
    free: boolean;
    freeValue: string | null;
    pro: boolean;
    proValue: string | null;
    premium: boolean;
    premiumValue: string | null;
  }) => {
    let hasFeature: boolean;
    
    if (planId === 'free') {
      hasFeature = feature.free;
    } else if (planId === 'pro') {
      hasFeature = feature.pro;
    } else {
      hasFeature = feature.premium;
    }
    
    return (
      <>
        {hasFeature ? (
          <Check className="text-green-500 flex-shrink-0" size={20} />
        ) : (
          <X className="text-red-500 flex-shrink-0" size={20} />
        )}
      </>
    );
  };

  return (
    <div className="py-8 px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Get more done with TLDRit's powerful summarization tools
        </p>
      </div>
      
      <div className="container mx-auto px-4 pt-8">
        <div className="flex flex-col lg:flex-row justify-center gap-8">
          {plans.map((plan) => {
            const isCurrentPlan =
              (plan.id === 'free' && !user?.isPremium) ||
              ((plan.id === 'pro' || plan.id === 'premium') && user?.isPremium);

            return (
              <Card
                key={plan.id}
                className={`relative w-full lg:w-[400px] shrink-0 ${
                  plan.highlight
                    ? 'border-2 border-blue-500 shadow-xl z-10'
                    : 'border border-gray-200 dark:border-gray-700 shadow-lg'
                } transition-all duration-200 hover:shadow-2xl mt-6`}
              >
                {plan.popular && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                    <span className="bg-blue-500 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center space-y-6 pb-8 pt-10 px-12">
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <div className="flex flex-col items-center">
                    <span className="text-5xl font-bold">
                      {plan.priceDisplay}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                        /month
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-center text-base">
                    {plan.id === 'free' 
                      ? 'Perfect for getting started' 
                      : plan.id === 'pro'
                      ? 'Everything you need to supercharge your productivity'
                      : 'Ultimate power user experience'
                    }
                  </p>
                  {plan.id === 'premium' && (
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span>* Fair Use Policy</span>
                      <Tooltip content="View Terms & Conditions">
                        <Link 
                          to={{
                            pathname: '/terms',
                            hash: 'fair-use-policy'
                          }}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Info size={14} />
                        </Link>
                      </Tooltip>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="px-12 pb-8">
                  <ul className="space-y-6">
                    {features.map((feature) => (
                      feature.label !== 'Ad-free experience' || plan.id === 'premium' ? (
                        <li key={feature.label} className="grid grid-cols-[24px,1fr,auto] items-start gap-4">
                          <div className="pt-0.5">
                            {getFeatureDisplay(plan.id, feature)}
                          </div>
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {feature.label}
                          </span>
                          {(planId => {
                            let value = null;
                            if (planId === 'free') value = feature.freeValue;
                            else if (planId === 'pro') value = feature.proValue;
                            else value = feature.premiumValue;
                            
                            return value ? (
                              <span className="text-sm text-gray-600 dark:text-gray-400 text-right min-w-[80px]">
                                {value}
                              </span>
                            ) : null;
                          })(plan.id)}
                        </li>
                      ) : null
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="px-12 pb-8">
                  <Button
                    variant={plan.highlight ? 'primary' : 'outline'}
                    fullWidth
                    disabled={!isAuthenticated || isCurrentPlan}
                    onClick={() => handleUpgrade(plan.id)}
                    className={`py-3 text-base ${plan.highlight ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  >
                    {isCurrentPlan
                      ? 'Current Plan'
                      : plan.id === 'free'
                      ? 'Downgrade'
                      : plan.id === 'pro'
                      ? 'Upgrade to Pro'
                      : 'Upgrade to Premium'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold mb-8">Why Choose TLDRit?</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Check className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h4 className="font-semibold mb-2">Lightning Fast</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Get summaries in seconds, not minutes
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Check className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <h4 className="font-semibold mb-2">Privacy First</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your data stays yours, always secure
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Check className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <h4 className="font-semibold mb-2">Multiple Formats</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Export to PDF, DOCX, or Markdown
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;