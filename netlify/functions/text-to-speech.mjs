import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async function(event, context) {
  console.log('TTS function invoked');
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
    const { text, isPremium, type, sourceUrl } = JSON.parse(event.body);
    const authHeader = event.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid user token' }),
      };
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, credits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'No profile found' }),
      };
    }

    // Allow free users to generate audio for news TLDRs
    if (type !== 'news' && profile.plan !== 'pro' && profile.credits <= 0) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'No credits left or not pro.' }),
      };
    }

    // If not pro and not a news TLDR, decrement credits
    if (profile.plan !== 'pro' && type !== 'news') {
      await supabase
        .from('profiles')
        .update({ credits: profile.credits - 1 })
        .eq('id', user.id);
    }

    // Use OpenAI's text-to-speech API
    const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Choose voice based on plan
    const voice = profile.plan === 'pro' ? 'alloy' : 'echo';
    
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Get the audio data
    const audioBuffer = await response.buffer();
    
    // Upload audio to Supabase storage
    const fileName = `audio/${user.id}/${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('tldrit')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mp3',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload error: ${uploadError.message}`);
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('tldrit')
      .getPublicUrl(fileName);

    // If this is a news TLDR, store the audio URL in the news table
    if (type === 'news' && sourceUrl) {
      const urlHash = crypto.createHash('md5').update(sourceUrl).digest('hex');
      await supabase
        .from('news')
        .upsert({
          url_hash: urlHash,
          source_url: sourceUrl,
          audio_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'url_hash'
        });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        audioUrl: publicUrl,
      }),
    };

  } catch (error) {
    console.error('Error generating audio:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to generate audio',
        details: error.message 
      }),
    };
  }
};
