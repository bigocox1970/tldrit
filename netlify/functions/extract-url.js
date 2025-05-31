const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

exports.handler = async function(event, context) {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { url } = JSON.parse(event.body);

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' }),
      };
    }

    // Fetch the URL content with custom headers and timeout
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      // If not HTML, try to get the raw text
      const text = await response.text();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          content: text.substring(0, 5000), // Limit content length
          url,
        }),
      };
    }

    const html = await response.text();
    
    // Parse HTML and extract content
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Try to extract main content from various selectors
    let content = '';
    let foundContent = false;
    
    // Try article tag first
    const article = document.querySelector('article');
    if (article) {
      content = article.textContent;
      foundContent = true;
    }

    // If no article found, try main content area
    if (!foundContent) {
      const main = document.querySelector('main');
      if (main) {
        content = main.textContent;
        foundContent = true;
      }
    }

    // Try common content selectors
    if (!foundContent) {
      const contentSelectors = [
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.story-body',
        '.post-body',
        '#content',
        '.main-content',
        '.article__body',
        '.article-body',
        '.story-content',
        '.post-content',
        '.news-article',
        '[itemprop="articleBody"]',
        '[role="main"]'
      ];
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          content = element.textContent;
          foundContent = true;
          break;
        }
      }
    }

    // If still no content found, try to get text from paragraphs in the body
    if (!foundContent) {
      const paragraphs = document.querySelectorAll('p');
      if (paragraphs.length > 0) {
        content = Array.from(paragraphs)
          .map(p => p.textContent.trim())
          .filter(text => text.length > 50) // Filter out short paragraphs
          .join('\n\n');
        foundContent = true;
      }
    }
    
    // Fallback to body if nothing else found
    if (!foundContent) {
      const body = document.querySelector('body');
      if (body) {
        content = body.textContent;
      }
    }

    // Clean up the content
    content = content
      .replace(/\s*\n\s*\n\s*/g, '\n\n') // Preserve paragraph breaks
      .replace(/\s*\n\s*/g, ' ') // Convert single line breaks to spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\[.*?\]/g, '') // Remove square bracket content
      .replace(/\(.*?\)/g, '') // Remove parenthetical content
      .trim();

    // Limit content length
    if (content.length > 5000) {
      content = content.substring(0, 5000);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content,
        url,
      }),
    };

  } catch (error) {
    console.error('Error extracting content from URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to extract content from URL',
        details: error.message,
        url: event.body ? JSON.parse(event.body).url : null
      }),
    };
  }
};
