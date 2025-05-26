export interface User {
  id: string;
  email: string;
  isPremium: boolean;
  interests: string[];
  eli5Age?: number;
}

export interface Summary {
  id: string;
  userId: string;
  title: string;
  originalContent: string;
  summary: string;
  createdAt: string;
  audioUrl?: string;
  isEli5: boolean;
  summaryLevel: number; // 1-5, where 1 is shortest, 5 is most detailed
  eli5Level?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  sourceUrl: string;
  category: string;
  summary: string;
  publishedAt: string;
  imageUrl?: string;
  audioUrl?: string;
}

export interface SummaryRequest {
  content: string;
  contentType: 'text' | 'url' | 'file';
  summaryLevel: number;
  isEli5: boolean;
  eli5Level?: number;
}

export interface UserInterest {
  id: string;
  name: string;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  features: string[];
}