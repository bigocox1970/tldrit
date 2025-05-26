/**
 * RSS FEED PROCESSING LIBRARY
 * 
 * This library handles RSS feed fetching and parsing for the news feed feature.
 * It includes category-specific RSS sources and content extraction.
 * 
 * KEY FEATURES:
 * - Category-based RSS feed sources
 * - RSS XML parsing and content extraction
 * - Image URL extraction from content
 * - Fallback handling for failed feeds
 * - CORS proxy through allorigins.win
 * 
 * CATEGORIES SUPPORTED:
 * - Technology, Crypto, AI, Entertainment, Science, Politics, Sports
 */

import { NewsItem } from '../types';

// RSS feed sources organized by category
const RSS_SOURCES = {
  technology: [
    'https://feeds.feedburner.com/TechCrunch',
    'https://www.theverge.com/rss/index.xml',
    'https://feeds.arstechnica.com/arstechnica/index'
  ],
  crypto: [
    'https://cointelegraph.com/rss',
    'https://www.coindesk.com/arc/outboundfeeds/rss/'
  ],
  ai: [
    'https://feeds.feedburner.com/venturebeat/SZYF',
    'https://www.artificialintelligence-news.com/feed/'
  ],
  entertainment: [
    'https://feeds.feedburner.com/variety/headlines',
    'https://www.hollywoodreporter.com/feed/'
  ],
  science: [
    'https://rss.cnn.com/rss/edition.rss',
    'https://feeds.sciencedaily.com/sciencedaily'
  ],
  politics: [
    'https://feeds.npr.org/1001/rss.xml',
    'https://rss.cnn.com/rss/cnn_allpolitics.rss'
  ],
  sports: [
    'https://rss.espn.com/rss/news',
    'https://www.cbssports.com/rss/headlines'
  ]
};

async function fetchRSSFeed(url: string): Promise<NewsItem[]> {
  try {
    console.log(`Fetching RSS feed for ${url}...`);
    
    // Use allorigins.win as CORS proxy
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.contents) {
      throw new Error('No content received from proxy');
    }

    // Parse the RSS XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
    
    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Failed to parse RSS XML');
    }

    const items = xmlDoc.querySelectorAll('item');
    const newsItems: NewsItem[] = [];

    items.forEach((item, index) => {
      try {
        const title = item.querySelector('title')?.textContent?.trim();
        const link = item.querySelector('link')?.textContent?.trim();
        const description = item.querySelector('description')?.textContent?.trim();
        const pubDate = item.querySelector('pubDate')?.textContent?.trim();
        const category = item.querySelector('category')?.textContent?.trim() || 'general';

        if (title && link && description) {
          // Extract image URL from description or content (original working approach)
          let imageUrl = '';
          const imgMatch = description.match(/<img[^>]+src="([^">]+)"/);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }

          // Also try single quotes
          if (!imageUrl) {
            const imgMatchSingle = description.match(/<img[^>]+src='([^'>]+)'/);
            if (imgMatchSingle) {
              imageUrl = imgMatchSingle[1];
            }
          }

          // Try media:thumbnail
          if (!imageUrl) {
            const mediaThumbnail = item.querySelector('media\\:thumbnail');
            if (mediaThumbnail) {
              imageUrl = mediaThumbnail.getAttribute('url') || '';
            }
          }

          // Clean up description by removing HTML tags
          const cleanDescription = description.replace(/<[^>]*>/g, '').trim();

          newsItems.push({
            id: `${url}-${index}-${Date.now()}`,
            title,
            sourceUrl: link,
            category: category.toLowerCase(),
            summary: cleanDescription.substring(0, 300) + (cleanDescription.length > 300 ? '...' : ''),
            publishedAt: pubDate || new Date().toISOString(),
            imageUrl: imageUrl || undefined,
          });
        }
      } catch (itemError) {
        console.warn('Error processing RSS item:', itemError);
      }
    });

    return newsItems;
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    throw error;
  }
}

export async function fetchNewsForCategories(categories: string[]): Promise<NewsItem[]> {
  const allNewsItems: NewsItem[] = [];
  
  for (const category of categories) {
    try {
      console.log(`Fetching RSS feed for ${category}...`);
      
      const feedUrls = RSS_SOURCES[category as keyof typeof RSS_SOURCES] || [];
      
      for (const feedUrl of feedUrls) {
        try {
          const items = await fetchRSSFeed(feedUrl);
          // Add category to items that don't have one
          const categorizedItems = items.map(item => ({
            ...item,
            category: item.category === 'general' ? category : item.category
          }));
          allNewsItems.push(...categorizedItems);
          
          // Break after first successful feed for each category to avoid too many requests
          break;
        } catch (feedError) {
          console.warn(`Failed to fetch ${feedUrl}:`, feedError);
          // Continue to next feed URL
        }
      }
    } catch (error) {
      console.error(`Error fetching news for category ${category}:`, error);
    }
  }

  // Sort by publication date (newest first)
  allNewsItems.sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return dateB - dateA;
  });

  // Remove duplicates based on title similarity
  const uniqueItems = allNewsItems.filter((item, index, arr) => {
    return !arr.slice(0, index).some(prevItem => 
      prevItem.title.toLowerCase().includes(item.title.toLowerCase().substring(0, 20)) ||
      item.title.toLowerCase().includes(prevItem.title.toLowerCase().substring(0, 20))
    );
  });

  return uniqueItems.slice(0, 50); // Limit to 50 items
}
