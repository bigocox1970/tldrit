import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface ExtractUrlRequest {
  url: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Get the request body
    const { url } = await req.json() as ExtractUrlRequest;

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch the URL content and extract the main text
    let content = '';
    try {
      const res = await fetch(url);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (doc) {
        // Try to extract <article>, <main>, or <body> text
        content = doc.querySelector('article')?.textContent ||
                  doc.querySelector('main')?.textContent ||
                  doc.querySelector('body')?.textContent || '';
        content = content.replace(/\s+/g, ' ').trim();
        content = content.slice(0, 5000); // Limit to 5000 chars
      } else {
        content = 'Failed to parse HTML content.';
      }
    } catch {
      content = 'Failed to fetch or parse the URL.';
    }

    return new Response(
      JSON.stringify({
        content,
        url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to extract content from URL" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});