import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface TTSRequest {
  text: string;
  isPremium: boolean;
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

    const { text, isPremium } = await req.json() as TTSRequest;

    if (!isPremium && text.length > 300) {
      return new Response(
        JSON.stringify({ error: "Free users are limited to 300 characters for text-to-speech" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (isPremium) {
      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || !profile.is_premium) {
        return new Response(
          JSON.stringify({ error: "Premium subscription required for this feature" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Call OpenAI TTS API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "alloy",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate audio");
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from("audio")
      .upload(
        `tts/${user.id}/${Date.now()}.mp3`,
        audioBuffer,
        {
          contentType: "audio/mpeg",
          cacheControl: "3600",
        }
      );

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabaseClient
      .storage
      .from("audio")
      .getPublicUrl(uploadData.path);

    return new Response(
      JSON.stringify({ audioUrl: publicUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate audio" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});