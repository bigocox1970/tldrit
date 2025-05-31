const Parser = require('rss-parser');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RSS_FEEDS = {
  technology: "https://www.theverge.com/rss/index.xml",
  world: "https://feeds.bbci.co.uk/news/world/rss.xml",
  business: "https://www.cnbc.com/id/100003114/device/rss/rss.xml",
  science: "https://www.sciencedaily.com/rss/top/science.xml",
  crypto: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  health: "https://www.medicalnewstoday.com/rss",
  entertainment: "https://www.eonline.com/news.rss",
  sports: "https://www.espn.com/espn/rss/news",
  politics: "https://feeds.npr.org/1001/rss.xml",
  ai: "https://www.artificialintelligence-news.com/feed/",
};

// Function to extract image from content
function extractImageFromContent(content) {
  if (!content) return null;
  
  // Try to find img tags in content
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
  if (imgMatch) {
    return imgMatch[1];
  }
  
  // Try to find image URLs in content
  const urlMatch = content.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  
  return null;
}

// Function to get a fallback image based on category
function getCategoryImage(category) {
  const categoryImages = {
    technology: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=200&fit=crop",
    world: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop",
    business: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop",
    science: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=200&fit=crop",
    crypto: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=200&fit=crop",
    health: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=200&fit=crop",
    entertainment: "https://images.unsplash.com/photo-1489599856641-b2d54d0b0b78?w=400&h=200&fit=crop",
    sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400&h=200&fit=crop",
    politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=200&fit=crop",
    ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop",
  };
  
  return categoryImages[category] || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&h=200&fit=crop";
}

// Function to generate consistent ID from source URL
function generateNewsId(sourceUrl) {
  return crypto.createHash('md5').update(sourceUrl).digest('hex');
}

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const parser = new Parser({
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['enclosure', 'enclosure'],
          ['description', 'description'],
          ['content:encoded', 'contentEncoded']
        ]
      }
    });

    let categories = ['technology', 'world', 'business', 'science'];
    if (event.body) {
      try {
        const body = JSON.parse(event.body);
        if (body.categories && Array.isArray(body.categories)) {
          categories = body.categories;
        }
      } catch (e) {
        console.log('Could not parse request body, using default categories');
      }
    }

    console.log('Fetching news for categories:', categories);

    const newsItems = [];
    const promises = categories.map(async (category) => {
      if (!RSS_FEEDS[category]) {
        console.log(`No RSS feed found for category: ${category}`);
        return;
      }

      try {
        console.log(`Fetching RSS feed for ${category}: ${RSS_FEEDS[category]}`);
        const feed = await parser.parseURL(RSS_FEEDS[category]);
        
        const items = feed.items.slice(0, 3).map((item) => {
          // Extract image from multiple sources
          let imageUrl = null;
          
          // Try enclosure first (common in RSS)
          if (item.enclosure && item.enclosure.url) {
            imageUrl = item.enclosure.url;
          }
          // Try media content
          else if (item.mediaContent && item.mediaContent.$) {
            imageUrl = item.mediaContent.$.url;
          }
          // Try media thumbnail
          else if (item.mediaThumbnail && item.mediaThumbnail.$) {
            imageUrl = item.mediaThumbnail.$.url;
          }
          // Try to extract from content
          else if (item.contentEncoded) {
            imageUrl = extractImageFromContent(item.contentEncoded);
          }
          else if (item.content) {
            imageUrl = extractImageFromContent(item.content);
          }
          else if (item.description) {
            imageUrl = extractImageFromContent(item.description);
          }
          
          // Use category fallback image if no image found
          if (!imageUrl) {
            imageUrl = getCategoryImage(category);
          }

          // Clean up description for summary
          let summary = item.description || item.content || item.contentEncoded || '';
          // Remove HTML tags
          summary = summary.replace(/<[^>]*>/g, '');
          // Limit length
          if (summary.length > 300) {
            summary = summary.substring(0, 300) + '...';
          }

          const urlHash = generateNewsId(item.link || '');

          return {
            id: urlHash,
            title: item.title || 'No title',
            summary: summary || 'No summary available',
            sourceUrl: item.link || '',
            category: category,
            publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            imageUrl: imageUrl,
            audioUrl: null, // Will be populated from database
            tldr: null
          };
        });

        // Fetch audio URLs from database
        const urlHashes = items.map(item => item.id);
        const { data: audioData } = await supabase
          .from('news_items')
          .select('url_hash, audio_url')
          .in('url_hash', urlHashes);

        // Map audio URLs to items
        if (audioData) {
          const audioMap = Object.fromEntries(
            audioData.map(item => [item.url_hash, item.audio_url])
          );
          items.forEach(item => {
            item.audioUrl = audioMap[item.id] || null;
          });
        }

        newsItems.push(...items);
      } catch (error) {
        console.error(`Error fetching ${category} feed:`, error);
      }
    });

    await Promise.all(promises);

    // Sort by published date (newest first)
    newsItems.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    console.log(`Successfully fetched ${newsItems.length} news items`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        newsItems: newsItems,
        count: newsItems.length
      }),
    };

  } catch (error) {
    console.error('Error in fetch-news function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch news',
        details: error.message
      }),
    };
  }
};
