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
  inPlaylist?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  sourceUrl: string;
  category: string;
  summary: string;
  tldr?: string; // AI-generated TLDR (long summary)
  publishedAt: string;
  imageUrl?: string;
  audioUrl?: string;
  inPlaylist?: boolean;
  bookmarked?: boolean;
  dbId?: string; // Database UUID for bookmark operations (when news item exists in DB)
}

export interface SummaryRequest {
  content: string | File;
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
