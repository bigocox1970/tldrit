import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { parse } from "npm:rss-parser@3.13.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const RSS_FEEDS = {
  technology: "https://www.theverge.com/rss/index.xml",
  world: "https://feeds.bbci.co.uk/news/world/rss.xml",
  business: "https://www.cnbc.com/id/100003114/device/rss/rss.xml",
  science: "https://www.sciencedaily.com/rss/top/science.xml",
  crypto: "https://www.coindesk.com/arc/outboundfeeds/rss/",
};

const parser = new parse();

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get user's interests
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError) throw userError;

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("interests")
      .eq("id", user?.id)
      .single();

    const userInterests = profile?.interests || ["technology"];

    // Fetch and parse RSS feeds for user's interests
    const newsItems = [];
    for (const interest of userInterests) {
      if (RSS_FEEDS[interest as keyof typeof RSS_FEEDS]) {
        try {
          const feed = await parser.parseURL(RSS_FEEDS[interest as keyof typeof RSS_FEEDS]);
          
          for (const item of feed.items.slice(0, 5)) { // Get top 5 items per feed
            const summary = await summarizeArticle(item.content || item.description || "");
            
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

    // Save to database
    if (newsItems.length > 0) {
      const { error } = await supabaseClient
        .from("news")
        .upsert(
          newsItems,
          { 
            onConflict: "source_url",
            ignoreDuplicates: true,
          }
        );

      if (error) throw error;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch news" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function summarizeArticle(content: string): Promise<string> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
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
    return content.slice(0, 200) + "..."; // Fallback to truncated content
  }
}