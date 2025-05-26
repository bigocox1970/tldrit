const { createClient } = require('@supabase/supabase-js');
const Parser = require('rss-parser');
const fetch = require('node-fetch');

const RSS_FEEDS = {
  technology: "https://www.theverge.com/rss/index.xml",
  world: "https://feeds.bbci.co.uk/news/world/rss.xml",
  business: "https://www.cnbc.com/id/100003114/device/rss/rss.xml",
  science: "https://www.sciencedaily.com/rss/top/science.xml",
  crypto: "https://www.coindesk.com/arc/outboundfeeds/rss/",
};

exports.handler = async function(event, context) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const parser = new Parser();

  // For MVP, use default interests
  const userInterests = ["technology", "world", "business"];

  const newsItems = [];
  for (const interest of userInterests) {
    if (RSS_FEEDS[interest]) {
      try {
        const feed = await parser.parseURL(RSS_FEEDS[interest]);
        for (const item of feed.items.slice(0, 5)) {
          const summary = await summarizeArticle(item.content || item.description || "", OPENAI_API_KEY);
          newsItems.push({
            title: item.title,
            source_url: item.link,
            category: interest,
            summary,
            published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
            image_url: item.enclosure?.url || null,
          });
        }
      } catch (error) {
        console.error(`Error fetching ${interest} feed:`, error);
      }
    }
  }

  if (newsItems.length > 0) {
    await supabase
      .from("news")
      .upsert(newsItems, { onConflict: "source_url", ignoreDuplicates: true });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, count: newsItems.length }),
  };
};

async function summarizeArticle(content, OPENAI_API_KEY) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional news editor. Create concise, informative summaries that capture the key points while maintaining accuracy.",
          },
          {
            role: "user",
            content: `Summarize this article in about 100 words:\n\n${content}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error summarizing article:", error);
    return content.slice(0, 200) + "...";
  }
} 