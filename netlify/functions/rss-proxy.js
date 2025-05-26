const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Enable CORS for all origins
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method not allowed',
        message: 'Only GET requests are supported'
      }),
    };
  }

  const { url } = event.queryStringParameters || {};

  // Validate URL parameter
  if (!url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Missing required parameter',
        message: 'URL parameter is required'
      }),
    };
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Invalid URL format',
        message: 'The provided URL is not valid'
      }),
    };
  }

  // Security: Only allow RSS/XML feeds from known domains
  const allowedDomains = [
    'feeds.feedburner.com',
    'feeds.bbci.co.uk',
    'rss.cnn.com',
    'cointelegraph.com',
    'feeds.npr.org',
    'rss.espn.com',
    'techcrunch.com',
    'variety.com',
    'reuters.com',
    'venturebeat.com'
  ];

  const urlObj = new URL(url);
  const isAllowedDomain = allowedDomains.some(domain => 
    urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
  );

  if (!isAllowedDomain) {
    console.warn(`Blocked request to unauthorized domain: ${urlObj.hostname}`);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ 
        error: 'Domain not allowed',
        message: 'RSS feeds are only allowed from authorized news sources'
      }),
    };
  }

  try {
    console.log(`[RSS Proxy] Fetching RSS feed: ${url}`);
    const startTime = Date.now();
    
    // Fetch with timeout and proper headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TLDRit RSS Reader/1.0 (https://tldrit.netlify.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
      },
      timeout: 15000,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const fetchTime = Date.now() - startTime;

    if (!response.ok) {
      console.error(`[RSS Proxy] HTTP error ${response.status} for ${url}`);
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('xml') && !contentType.includes('rss') && !contentType.includes('atom')) {
      console.warn(`[RSS Proxy] Unexpected content type: ${contentType} for ${url}`);
    }

    const content = await response.text();

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response content');
    }

    // Basic validation that we got XML content
    if (!content.includes('<rss') && !content.includes('<feed') && !content.includes('<?xml')) {
      throw new Error('Response does not appear to be valid RSS/XML content');
    }

    console.log(`[RSS Proxy] Successfully fetched ${content.length} bytes in ${fetchTime}ms from ${url}`);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: content,
        status: {
          url: url,
          content_type: response.headers.get('content-type'),
          http_code: response.status,
          content_length: content.length,
          fetch_time_ms: fetchTime,
          timestamp: new Date().toISOString(),
        },
      }),
    };

  } catch (error) {
    const errorMessage = error.message || 'Unknown error occurred';
    console.error(`[RSS Proxy] Error fetching RSS feed from ${url}:`, error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.name === 'AbortError') {
      statusCode = 408; // Request Timeout
    } else if (errorMessage.includes('HTTP error')) {
      statusCode = 502; // Bad Gateway
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      statusCode = 503; // Service Unavailable
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch RSS feed',
        message: errorMessage,
        url: url,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
