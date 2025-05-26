import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
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

    // Get the user from the request
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

    // Check if the user is premium
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.is_premium || false;

    // Get form data with the file
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check file size limits based on subscription
    const maxSize = isPremium ? 20 * 1024 * 1024 : 5 * 1024 * 1024; // 20MB for premium, 5MB for free
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ 
          error: `File size exceeds the limit (${isPremium ? '20MB' : '5MB'})` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // In a real implementation, you would process the file based on its type
    // (e.g., extract text from PDF, parse DOCX, etc.)
    // This is a mock implementation
    const content = await mockFileProcessing(file);

    return new Response(
      JSON.stringify({
        content,
        filename: file.name,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process file" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Mock file processing function
async function mockFileProcessing(file: File): Promise<string> {
  // In a real implementation, this would extract text from various file formats
  return `This is simulated content extracted from the file: ${file.name}
  
  In a production environment, we would:
  1. Determine the file type based on extension and MIME type
  2. Use appropriate libraries to extract text content
  3. For PDFs: Use a PDF parser library
  4. For DOCX: Use a Word document parser
  5. For TXT: Simply read the text content
  
  The document would contain several pages of content that would be processed for summarization.`;
}