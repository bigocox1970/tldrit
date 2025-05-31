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

// Function to generate consistent ID from source URL
function generateNewsId(sourceUrl) {
  return crypto.createHash('md5').update(sourceUrl).digest('hex');
}

function extractVentureBeatImage(content) {
  if (!content) return null;
  
  try {
    // Try meta tags first with more specific VentureBeat patterns
    const metaPatterns = [
      /<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i,
      /<meta[^>]+name="twitter:image"[^>]+content="([^">]+)"/i,
      /<meta[^>]+property="og:image:url"[^>]+content="([^">]+)"/i,
      /<meta[^>]+name="sailthru.image.full"[^>]+content="([^">]+)"/i
    ];

    for (const pattern of metaPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const imageUrl = match[1].trim();
        if (imageUrl.startsWith('http')) {
          console.log('Found VentureBeat image in meta tags:', imageUrl);
          return imageUrl;
        }
      }
    }

    // Try VentureBeat specific image patterns
    const imagePatterns = [
      // Featured image container
      /<div[^>]*class="[^"]*article-featured-image[^"]*"[^>]*>.*?<img[^>]+src="([^">]+)"/i,
      // WordPress featured image
      /<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^">]+)"/i,
      // Article header image
      /<div[^>]*class="[^"]*article-header-image[^"]*"[^>]*>.*?<img[^>]+src="([^">]+)"/i,
      // General article images
      /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>.*?<img[^>]+src="([^">]+)"/i,
      // Fallback to any image in the content
      /<img[^>]+src="([^">]+)"/i
    ];

    for (const pattern of imagePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const imageUrl = match[1].trim();
        if (imageUrl.startsWith('http') && !imageUrl.includes('advertisement')) {
          console.log('Found VentureBeat image in content:', imageUrl);
          return imageUrl;
        }
      }
    }

    console.log('No suitable image found in VentureBeat content');
    return null;
  } catch (error) {
    console.error('Error extracting VentureBeat image:', error);
    return null;
  }
}

// Function to extract image from content
function extractImageFromContent(content, sourceUrl) {
  if (!content) return null;
  
  try {
    // Special handling for venturebeat.com
    if (sourceUrl && sourceUrl.includes('venturebeat.com')) {
      console.log('Processing VentureBeat article:', sourceUrl);
      const image = extractVentureBeatImage(content);
      if (image) return image;
    }
    
    // Fallback to general image extraction
    // Try meta tags first
    const metaMatch = content.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i) ||
                     content.match(/<meta[^>]+name="twitter:image"[^>]+content="([^">]+)"/i);
    if (metaMatch) {
      return metaMatch[1];
    }
    
    // Try to find any suitable image
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/i);
    if (imgMatch && !imgMatch[1].includes('advertisement')) {
      return imgMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting image from content:', error);
    return null;
  }
}

// Function to get default category image
function getCategoryImage(category) {
  const defaultImages = {
    technology: '/images/categories/technology.jpg',
    world: '/images/categories/world.jpg',
    business: '/images/categories/business.jpg',
    science: '/images/categories/science.jpg',
    crypto: '/images/categories/crypto.jpg',
    health: '/images/categories/health.jpg',
    entertainment: '/images/categories/entertainment.jpg',
    sports: '/images/categories/sports.jpg',
    politics: '/images/categories/politics.jpg',
    ai: '/images/categories/ai.jpg',
  };
  return defaultImages[category] || '/images/categories/default.jpg';
}

exports.handler = async function(event) {
  try {
    const parser = new Parser({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: 10000,
      maxRedirects: 5,
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
          ['media:group', 'mediaGroup'],
          ['enclosure', 'enclosure'],
          ['description', 'description'],
          ['content:encoded', 'contentEncoded']
        ]
      }
    });

    const { category } = JSON.parse(event.body);
    
    if (!RSS_FEEDS[category]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid category' })
      };
    }

    console.log('Fetching news for category:', category);
    console.log('RSS feed URL:', RSS_FEEDS[category]);

    const feed = await parser.parseURL(RSS_FEEDS[category]);
    console.log('Feed parsed successfully');

    const items = await Promise.all(feed.items.slice(0, 3).map(async (item) => {
      console.log('Processing item:', item.title);
      
      let imageUrl = null;

      // Try to get image from media fields first
      if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
        imageUrl = item.mediaContent.$.url;
        console.log('Found image in mediaContent:', imageUrl);
      } else if (item.mediaThumbnail && item.mediaThumbnail.$ && item.mediaThumbnail.$.url) {
        imageUrl = item.mediaThumbnail.$.url;
        console.log('Found image in mediaThumbnail:', imageUrl);
      } else if (item.enclosure && item.enclosure.url) {
        imageUrl = item.enclosure.url;
        console.log('Found image in enclosure:', imageUrl);
      }

      // If no image found in media fields, try to extract from content
      if (!imageUrl && (item.content || item['content:encoded'] || item.description)) {
        const content = item['content:encoded'] || item.content || item.description;
        imageUrl = extractImageFromContent(content, item.link);
        console.log('Extracted image from content:', imageUrl);
      }

      // If still no image, use category default
      if (!imageUrl) {
        imageUrl = getCategoryImage(category);
        console.log('Using default category image:', imageUrl);
      }

      const newsId = generateNewsId(item.link);
      console.log('Generated news ID:', newsId);

      return {
        id: newsId,
        title: item.title,
        description: item.contentSnippet || item.description,
        link: item.link,
        image: imageUrl,
        pubDate: item.pubDate || item.isoDate,
        category
      };
    }));

    console.log('Processed all items successfully');

    return {
      statusCode: 200,
      body: JSON.stringify(items)
    };
  } catch (error) {
    console.error('Error in fetch-news handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
