import axios from 'axios';
// import { SummaryRequest } from '../types';
import { supabase } from './supabase';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface SummarizeOptions {
  isPremium: boolean;
  isEli5: boolean;
  summaryLevel: number;
  eli5Level?: number;
}

function getEliPrompt(age: number) {
  if (age <= 5) {
    return 'Explain in very simple terms, as if to a 5-year-old.';
  } else if (age <= 10) {
    return 'Explain in moderately simple terms, as if to a 10-year-old.';
  } else {
    return 'Explain in clear, but more advanced terms, as if to a 15-year-old.';
  }
}

export async function summarizeContent(content: string, options: SummarizeOptions) {
  const { isPremium, isEli5, summaryLevel, eli5Level } = options;
  
  // Determine which API to use based on content length and user's subscription
  const useOpenRouter = isPremium && content.length > 1000;
  const apiUrl = useOpenRouter ? OPENROUTER_API_URL : OPENAI_API_URL;
  
  // Select model based on content complexity and user's subscription
  const model = useOpenRouter 
    ? 'anthropic/claude-3-opus'
    : 'gpt-3.5-turbo';
  
  // Adjust summary length based on slider level (1-5)
  const summaryLength = getSummaryLengthFromLevel(summaryLevel);
  
  // Create system message
  const explicitEliPrompt = isEli5 ? `${getEliPrompt(eli5Level || 5)} The higher the age, the more advanced and detailed the explanation should be.` : '';
  const systemMessage = isEli5
    ? `You are an expert at explaining complex topics. ${explicitEliPrompt} Keep explanations clear, engaging, and use simple analogies when helpful.`
    : "You are an expert at creating concise, accurate summaries while preserving key information. Focus on main points and maintain the original tone.";
  
  // Create user message
  const userMessage = isEli5
    ? `${getEliPrompt(eli5Level || 5)} The higher the age, the more advanced and detailed the explanation should be. Explain the following in about ${summaryLength} words:\n\n${content}`
    : `Summarize the following in about ${summaryLength} words:\n\n${content}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (useOpenRouter) {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`;
      headers['HTTP-Referer'] = window.location.origin;
    } else {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`;
    }

    const response = await axios.post(apiUrl, {
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: summaryLength * 4, // Approximate tokens needed
    }, { headers });

    const summary = useOpenRouter
      ? response.data.choices[0].message.content
      : response.data.choices[0].message.content;

    return { summary };
  } catch (error) {
    console.error('Error summarizing content:', error);
    throw new Error('Failed to generate summary');
  }
}

export async function generateAudio(text: string, isPremium: boolean) {
  // Get the current user's session and access token
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('User must be authenticated to generate audio');
  }

  try {
    const response = await axios.post('/api/text-to-speech', {
      text,
      isPremium,
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    return response.data.audioUrl;
  } catch (error) {
    console.error('Error generating audio:', error);
    throw new Error('Failed to generate audio');
  }
}

function getSummaryLengthFromLevel(level: number): number {
  // Map summary level (1-5) to word count
  const wordCounts = {
    1: 50,    // Very Short
    2: 100,   // Short
    3: 200,   // Medium
    4: 350,   // Detailed
    5: 500,   // Comprehensive
  };
  
  return wordCounts[level as keyof typeof wordCounts] || 200;
}

export async function extractContentFromUrl(url: string) {
  try {
    // Get the current user's session and access token
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.post('/api/extract-url', { url }, { headers });
    return response.data.content;
  } catch (error) {
    console.error('Error extracting content from URL:', error);
    throw new Error('Failed to extract content from URL');
  }
}

export async function processFileContent(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post('/api/process-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data.content;
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error('Failed to process file');
  }
}
