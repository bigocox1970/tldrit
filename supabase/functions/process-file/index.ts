/**
 * SUPABASE PROCESS-FILE FUNCTION
 * 
 * This function handles file processing in the Supabase Edge Runtime environment.
 * 
 * IMPORTANT NOTE: This function has limitations due to Supabase Edge Runtime:
 * - PDF processing libraries (pdfjs-dist, pdf-parse) are not compatible
 * - Only TXT files can be processed directly
 * - PDF and DOCX files redirect users to use the production Netlify deployment
 * 
 * ARCHITECTURE DECISION:
 * - Local development routes to production Netlify function for full PDF support
 * - This function serves as a fallback and provides clear error messages
 * - Maintains authentication and file size validation
 * 
 * SUPPORTED OPERATIONS:
 * - TXT file processing: Direct text extraction
 * - File size validation: 5MB (free) / 20MB (premium)
 * - User authentication: Validates Supabase auth tokens
 * - Error handling: Provides informative error messages
 */

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
      .select("plan")
      .eq("id", user.id)
      .single();

    const isPremium = profile?.plan === 'pro' || profile?.plan === 'premium';

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

    // Process the file based on its type
    const content = await processFile(file);

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
      JSON.stringify({ error: "Failed to process file: " + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// File processing function
async function processFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.txt')) {
    // Process text files
    const text = await file.text();
    return text;
  } else if (fileName.endsWith('.pdf')) {
    // For PDFs, we'll need to use a different approach since pdfjs-dist doesn't work in Supabase Edge Runtime
    // For now, return an informative error directing users to use the production deployment
    throw new Error('PDF processing requires the production deployment. Please use the deployed version of the app for PDF file uploads, or convert your PDF to text format.');
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    // For Word documents
    throw new Error('DOCX processing is not yet implemented. Please convert your document to text format.');
  } else {
    throw new Error('Unsupported file type. Please upload TXT files, or use the production deployment for PDF support.');
  }
}
