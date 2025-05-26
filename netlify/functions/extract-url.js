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

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse HTML and extract content
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Try to extract main content from various selectors
    let content = '';
    
    // Try article tag first
    const article = document.querySelector('article');
    if (article) {
      content = article.textContent;
    } else {
      // Try main tag
      const main = document.querySelector('main');
      if (main) {
        content = main.textContent;
      } else {
        // Try common content selectors
        const contentSelectors = [
          '.content',
          '.post-content',
          '.entry-content',
          '.article-content',
          '.story-body',
          '.post-body',
          '#content',
          '.main-content'
        ];
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            content = element.textContent;
            break;
          }
        }
        
        // Fallback to body if nothing else found
        if (!content) {
          const body = document.querySelector('body');
          if (body) {
            content = body.textContent;
          }
        }
      }
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n+/g, ' ') // Replace newlines with space
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
        details: error.message 
      }),
    };
  }
};
