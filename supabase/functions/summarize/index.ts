import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Configuration, OpenAIApi } from "npm:openai@3.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface SummarizeRequest {
  content: string;
  model: string;
  systemMessage: string;
  userMessage: string;
  maxTokens: number;
}

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

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { content, model, systemMessage, userMessage, maxTokens } = await req.json() as SummarizeRequest;

    if (model === "gpt-3.5-turbo") {
      const openai = new OpenAIApi(new Configuration({
        apiKey: Deno.env.get("OPENAI_API_KEY"),
      }));

      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userMessage }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      return new Response(
        JSON.stringify({
          summary: completion.data.choices[0].message?.content,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // For OpenRouter (Claude-3)
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
          "HTTP-Referer": Deno.env.get("APP_URL") || "http://localhost:5173",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-opus",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: userMessage }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      return new Response(
        JSON.stringify({
          summary: data.choices[0].message.content,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate summary" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});