// netlify/functions/rss-proxy.js
var fetch = require("node-fetch");
exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "public, max-age=300"
    // Cache for 5 minutes
  };
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed",
        message: "Only GET requests are supported"
      })
    };
  }
  const { url } = event.queryStringParameters || {};
  if (!url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Missing required parameter",
        message: "URL parameter is required"
      })
    };
  }
  try {
    new URL(url);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Invalid URL format",
        message: "The provided URL is not valid"
      })
    };
  }
  const allowedDomains = [
    "feeds.feedburner.com",
    "feeds.bbci.co.uk",
    "rss.cnn.com",
    "cointelegraph.com",
    "feeds.npr.org",
    "rss.espn.com",
    "techcrunch.com",
    "variety.com",
    "reuters.com",
    "venturebeat.com"
  ];
  const urlObj = new URL(url);
  const isAllowedDomain = allowedDomains.some(
    (domain) => urlObj.hostname === domain || urlObj.hostname.endsWith("." + domain)
  );
  if (!isAllowedDomain) {
    console.warn(`Blocked request to unauthorized domain: ${urlObj.hostname}`);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: "Domain not allowed",
        message: "RSS feeds are only allowed from authorized news sources"
      })
    };
  }
  try {
    console.log(`[RSS Proxy] Fetching RSS feed: ${url}`);
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15e3);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TLDRit RSS Reader/1.0 (https://tldrit.netlify.app)",
        "Accept": "application/rss+xml, application/xml, text/xml, application/atom+xml",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache"
      },
      timeout: 15e3,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const fetchTime = Date.now() - startTime;
    if (!response.ok) {
      console.error(`[RSS Proxy] HTTP error ${response.status} for ${url}`);
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("xml") && !contentType.includes("rss") && !contentType.includes("atom")) {
      console.warn(`[RSS Proxy] Unexpected content type: ${contentType} for ${url}`);
    }
    const content = await response.text();
    if (!content || content.trim().length === 0) {
      throw new Error("Empty response content");
    }
    if (!content.includes("<rss") && !content.includes("<feed") && !content.includes("<?xml")) {
      throw new Error("Response does not appear to be valid RSS/XML content");
    }
    console.log(`[RSS Proxy] Successfully fetched ${content.length} bytes in ${fetchTime}ms from ${url}`);
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: content,
        status: {
          url,
          content_type: response.headers.get("content-type"),
          http_code: response.status,
          content_length: content.length,
          fetch_time_ms: fetchTime,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      })
    };
  } catch (error) {
    const errorMessage = error.message || "Unknown error occurred";
    console.error(`[RSS Proxy] Error fetching RSS feed from ${url}:`, error);
    let statusCode = 500;
    if (error.name === "AbortError") {
      statusCode = 408;
    } else if (errorMessage.includes("HTTP error")) {
      statusCode = 502;
    } else if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      statusCode = 503;
    }
    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: "Failed to fetch RSS feed",
        message: errorMessage,
        url,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      })
    };
  }
};
//# sourceMappingURL=rss-proxy.js.map
