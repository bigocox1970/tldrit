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
import { XMLParser } from 'fast-xml-parser';

interface RSSItem {
  title?: { '#text'?: string } | string;
  link?: { '#text'?: string; '@_href'?: string } | string;
  description?: string;
  summary?: string;
  'content:encoded'?: string;
  content?: string;
  pubDate?: string;
  published?: string;
  updated?: string;
  category?: { '#text'?: string } | string;
  'media:content'?: { '@_url'?: string };
  'media:thumbnail'?: { '@_url'?: string };
  enclosure?: { '@_type'?: string; '@_url'?: string };
}

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

// Function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#039;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢'
  };

  // Replace named entities
  let decoded = text.replace(/&[a-zA-Z0-9#]+;/g, (match) => {
    return entities[match] || match;
  });

  // Replace numeric entities (decimal)
  decoded = decoded.replace(/&#(\d+);/g, (match, num) => {
    return String.fromCharCode(parseInt(num, 10));
  });

  // Replace numeric entities (hexadecimal)
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return decoded;
}

async function fetchRSSFeed(url: string): Promise<NewsItem[]> {
  try {
    console.log(`Fetching RSS feed for ${url}...`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Parse the RSS XML using fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text'
    });
    
    const result = parser.parse(xmlText);
    const channel = result.rss?.channel || result.feed;
    
    if (!channel) {
      throw new Error('Invalid RSS feed format');
    }

    const items = channel.item || channel.entry || [];
    const newsItems: NewsItem[] = [];

    (Array.isArray(items) ? items : [items]).forEach((item: RSSItem, index: number) => {
      try {
        // Extract title with type checking
        let title: string | undefined;
        if (typeof item.title === 'string') {
          title = decodeHtmlEntities(item.title);
        } else if (item.title?.['#text']) {
          title = decodeHtmlEntities(item.title['#text']);
        }

        // Extract link with type checking
        let link: string | undefined;
        if (typeof item.link === 'string') {
          link = item.link;
        } else if (item.link?.['#text']) {
          link = item.link['#text'];
        } else if (item.link?.['@_href']) {
          link = item.link['@_href'];
        }

        const description = item.description || item.summary || '';
        const content = item['content:encoded'] || item.content || '';
        const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();
        
        // Extract category with type checking
        let category = 'general';
        if (typeof item.category === 'string') {
          category = item.category;
        } else if (item.category?.['#text']) {
          category = item.category['#text'];
        }
        category = category.toLowerCase();

        if (title && link) {
          // Extract image URL using multiple methods
          let imageUrl = '';
          
          // Try media:content
          if (item['media:content']?.['@_url']) {
            imageUrl = item['media:content']['@_url'];
          }
          
          // Try media:thumbnail
          if (!imageUrl && item['media:thumbnail']?.['@_url']) {
            imageUrl = item['media:thumbnail']['@_url'];
          }
          
          // Try enclosure
          if (!imageUrl && item.enclosure?.['@_type']?.startsWith('image/')) {
            imageUrl = item.enclosure['@_url'] || '';
          }
          
          // Try og:image or twitter:image in content
          if (!imageUrl) {
            const fullContent = content || description || '';
            const metaMatch = fullContent.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i) ||
                           fullContent.match(/<meta[^>]+name="twitter:image"[^>]+content="([^">]+)"/i);
            if (metaMatch) {
              imageUrl = metaMatch[1];
            }
          }

          // Try regular image tags
          if (!imageUrl) {
            const fullContent = content || description || '';
            const imgMatch = fullContent.match(/<img[^>]+src="([^">]+)"/i) ||
                          fullContent.match(/<img[^>]+src='([^'>]+)'/i);
            if (imgMatch) {
              imageUrl = imgMatch[1];
            }
          }

          // Clean up description
          const cleanDescription = decodeHtmlEntities(description.replace(/<[^>]*>/g, '')).trim();

          newsItems.push({
            id: `${url}-${index}-${Date.now()}`,
            title,
            sourceUrl: link,
            category,
            summary: cleanDescription.substring(0, 300) + (cleanDescription.length > 300 ? '...' : ''),
            publishedAt: pubDate,
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
