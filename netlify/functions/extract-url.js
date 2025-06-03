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
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000, // 30 second timeout (increased from 15s)
      redirect: 'follow', // Follow redirects
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

    // Remove unwanted elements before extracting content
    const unwantedSelectors = [
      'nav', 'header', 'footer', 'aside', 
      '.nav', '.navigation', '.menu', '.header', '.footer', '.sidebar',
      '.social', '.share', '.comments', '.related', '.ads', '.advertisement',
      'script', 'style', 'noscript', 'iframe', 'object', 'embed',
      '.cookie', '.banner', '.popup', '.overlay', '.modal'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

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
        '[role="main"]',
        // Additional selectors for various website types
        '.text',
        '.description',
        '.details',
        '.info',
        '#main',
        '.page-content',
        '.site-content',
        '.entry',
        '.post',
        '.content-area'
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
          .filter(text => text.length > 20) // Reduced minimum length
          .join('\n\n');
        foundContent = true;
      }
    }

    // Try div elements with substantial text content
    if (!foundContent) {
      const divs = document.querySelectorAll('div');
      const textDivs = Array.from(divs)
        .filter(div => {
          const text = div.textContent.trim();
          return text.length > 100 && !div.querySelector('div'); // No nested divs
        })
        .map(div => div.textContent.trim());
      
      if (textDivs.length > 0) {
        content = textDivs.join('\n\n');
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

    // Debug logging
    console.log('URL extraction debug for:', url);
    console.log('Content found:', foundContent);
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));

    // If content is too short or empty, provide debugging info
    if (!content || content.length < 100) {
      console.log('Content extraction failed for URL:', url);
      console.log('HTML length:', html.length);
      console.log('Found content:', content);
      
      // Try a more aggressive approach - get all text from body
      const bodyText = document.body ? document.body.textContent.trim() : '';
      if (bodyText.length > 100) {
        content = bodyText
          .replace(/\s+/g, ' ')
          .substring(0, 5000);
      } else {
        // Return the raw HTML as fallback for debugging
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            content: `Content extraction failed for this website. Raw HTML preview: ${html.substring(0, 1000)}...`,
            url,
            debug: {
              htmlLength: html.length,
              bodyTextLength: bodyText.length,
              foundContent: foundContent
            }
          }),
        };
      }
    }

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
