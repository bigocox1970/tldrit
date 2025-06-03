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
      timeout: 30000, // 30 second timeout
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      const text = await response.text();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          content: text.substring(0, 5000),
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

    // Try multiple extraction methods in order
    let content = '';
    let foundContent = false;
    let extractionMethod = '';
    
    // Method 1: Try modern semantic HTML
    const article = document.querySelector('article');
    if (article && article.textContent.trim().length > 100) {
      content = article.textContent;
      foundContent = true;
      extractionMethod = 'article';
    }

    if (!foundContent) {
      const main = document.querySelector('main');
      if (main && main.textContent.trim().length > 100) {
        content = main.textContent;
        foundContent = true;
        extractionMethod = 'main';
      }
    }

    // Method 2: Try common content selectors
    if (!foundContent) {
      const contentSelectors = [
        '.content', '.post-content', '.entry-content', '.article-content',
        '.story-body', '.post-body', '#content', '.main-content',
        '.article__body', '.article-body', '.story-content', '.news-article',
        '[itemprop="articleBody"]', '[role="main"]', '.text', '.description',
        '.details', '.info', '#main', '.page-content', '.site-content',
        '.entry', '.post', '.content-area'
      ];
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 100) {
          content = element.textContent;
          foundContent = true;
          extractionMethod = `selector: ${selector}`;
          break;
        }
      }
    }

    // Method 3: Try table-based layouts (common in old websites)
    if (!foundContent) {
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const tableText = table.textContent.trim();
        if (tableText.length > 200) {
          // Look for the largest cell content
          const cells = table.querySelectorAll('td');
          let largestCellText = '';
          for (const cell of cells) {
            const cellText = cell.textContent.trim();
            if (cellText.length > largestCellText.length && cellText.length > 100) {
              largestCellText = cellText;
            }
          }
          if (largestCellText.length > 200) {
            content = largestCellText;
            foundContent = true;
            extractionMethod = 'table-cell';
            break;
          }
        }
      }
    }

    // Method 4: Try paragraph extraction with better filtering
    if (!foundContent) {
      const paragraphs = document.querySelectorAll('p');
      if (paragraphs.length > 0) {
        const paragraphTexts = Array.from(paragraphs)
          .map(p => p.textContent.trim())
          .filter(text => text.length > 30) // Meaningful paragraphs
          .filter(text => !text.match(/^(Home|About|Contact|Menu|Navigation|©|\d{4})/i)); // Filter out navigation text
        
        if (paragraphTexts.length > 0) {
          content = paragraphTexts.join('\n\n');
          foundContent = true;
          extractionMethod = 'paragraphs';
        }
      }
    }

    // Method 5: Try div elements with substantial content (improved)
    if (!foundContent) {
      const divs = document.querySelectorAll('div');
      const textDivs = Array.from(divs)
        .map(div => ({
          element: div,
          text: div.textContent.trim(),
          directTextLength: div.childNodes ? 
            Array.from(div.childNodes)
              .filter(node => node.nodeType === 3) // Text nodes only
              .map(node => node.textContent.trim())
              .join(' ').length : 0
        }))
        .filter(item => item.text.length > 150)
        .filter(item => !item.element.querySelector('div, table')) // No nested complex elements
        .sort((a, b) => b.text.length - a.text.length); // Largest first
      
      if (textDivs.length > 0) {
        content = textDivs[0].text;
        foundContent = true;
        extractionMethod = 'div-content';
      }
    }

    // Method 6: Try span elements (sometimes used in old websites)
    if (!foundContent) {
      const spans = document.querySelectorAll('span');
      let largestSpanText = '';
      for (const span of spans) {
        const spanText = span.textContent.trim();
        if (spanText.length > largestSpanText.length && spanText.length > 200) {
          largestSpanText = spanText;
        }
      }
      if (largestSpanText.length > 200) {
        content = largestSpanText;
        foundContent = true;
        extractionMethod = 'span-content';
      }
    }

    // Method 7: Try all text content from body but filter out navigation
    if (!foundContent) {
      const bodyText = document.body ? document.body.textContent.trim() : '';
      if (bodyText.length > 200) {
        // Try to filter out common navigation patterns
        const lines = bodyText.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 20)
          .filter(line => !line.match(/^(Home|About|Contact|Menu|Navigation|Links|Copyright|©|\d{4}|All Rights Reserved)/i))
          .filter(line => !line.match(/^[A-Z\s]{2,20}$/)) // Skip all-caps navigation
          .filter(line => line.split(' ').length > 3); // Skip short phrases
        
        if (lines.length > 0) {
          content = lines.join('\n');
          foundContent = true;
          extractionMethod = 'filtered-body';
        }
      }
    }
    
    // Method 8: Fallback to raw body content
    if (!foundContent) {
      const body = document.querySelector('body');
      if (body) {
        content = body.textContent.trim();
        foundContent = true;
        extractionMethod = 'raw-body';
      }
    }

    // Clean up the content
    if (content) {
      content = content
        .replace(/\s*\n\s*\n\s*/g, '\n\n') // Normalize paragraph breaks
        .replace(/\s*\n\s*/g, ' ') // Convert single line breaks to spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\[.*?\]/g, '') // Remove square bracket content
        .replace(/\(.*?\)/g, '') // Remove parenthetical content
        .trim();
    }

    // Debug logging
    console.log('URL extraction debug for:', url);
    console.log('Extraction method:', extractionMethod);
    console.log('Content found:', foundContent);
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));

    // If content is still too short, provide better debugging
    if (!content || content.length < 100) {
      console.log('Content extraction failed for URL:', url);
      console.log('HTML length:', html.length);
      console.log('Found content:', content);
      
      // Last resort: return the visible text content with minimal filtering
      const bodyText = document.body ? document.body.textContent
        .replace(/\s+/g, ' ')
        .trim() : '';
        
      if (bodyText.length > 50) {
        content = bodyText.substring(0, 5000);
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            content: `Unable to extract meaningful content from this website. The site may have a complex structure or be primarily JavaScript-based. Raw HTML preview: ${html.substring(0, 1000)}...`,
            url,
            debug: {
              htmlLength: html.length,
              bodyTextLength: bodyText.length,
              extractionMethod: 'failed'
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
        debug: {
          extractionMethod,
          contentLength: content.length
        }
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
