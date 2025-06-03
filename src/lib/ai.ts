/**
 * AI LIBRARY - CORE AI INTEGRATION
 * 
 * This library handles all AI-related operations for TLDRit, including:
 * - Content summarization using OpenAI/OpenRouter
 * - URL content extraction
 * - File content processing
 * - Audio generation for summaries
 * - TLDR generation for news articles
 * 
 * KEY FUNCTIONS:
 * - summarizeContent(): Main AI summarization with ELI5 support
 * - extractContentFromUrl(): Extracts text from web pages
 * - processFileContent(): Processes uploaded files (PDF, TXT, DOCX)
 * - generateAudio(): Creates audio versions of summaries
 * - summarizeUrl(): Creates TLDR summaries from URLs
 * 
 * API ROUTING:
 * - OpenAI: Used for basic summarization (free users, short content)
 * - OpenRouter: Used for premium users with longer content
 * - Content extraction: Routes through Vite proxy to backend functions
 */

import axios from 'axios';
// import { SummaryRequest } from '../types';
import { supabase } from './supabase';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface SummarizeOptions {
  isEli5: boolean;
  summaryLevel: number;
  eli5Level?: number;
  isNewsArticle?: boolean;
}

export interface TLDROptions {
  isEli5?: boolean;
  summaryLevel?: number;
  eli5Level?: number;
  isNewsArticle?: boolean;
  hasPaidPlan?: boolean;
}

function getEliPrompt(age: number) {
  if (age <= 5) return 'Explain this like I\'m 5 years old.';
  if (age <= 8) return 'Explain this like I\'m 8 years old.';
  if (age <= 12) return 'Explain this like I\'m 12 years old.';
  if (age <= 16) return 'Explain this like I\'m a teenager.';
  return 'Explain this clearly but thoroughly for an adult.';
}

// Function to strip markdown formatting for TTS
function stripMarkdownForTTS(text: string): string {
  return text
    // Remove headers (## Header -> Header)
    .replace(/#{1,6}\s*/g, '')
    // Remove bold/italic formatting (**text** -> text, *text* -> text)
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet points (- item -> item)
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove numbered lists (1. item -> item)
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove code blocks and inline code
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    // Remove horizontal rules
    .replace(/^\s*---+\s*$/gm, '')
    // Replace multiple line breaks with a single space for better TTS flow
    .replace(/\n+/g, ' ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Clean up extra whitespace
    .trim();
}

export async function summarizeContent(content: string, options: SummarizeOptions) {
  const { isEli5, summaryLevel, eli5Level, isNewsArticle } = options;
  
  // Select model based on content complexity and user's subscription
  const model = 'gpt-3.5-turbo';
  
  // Adjust summary length based on slider level (1-5)
  const summaryLength = getSummaryLengthFromLevel(summaryLevel);
  
  // Create enhanced system message for news articles
  const markdownInstructions = `
- Use markdown for ALL structure.
- For every list of facts, key points, or steps, use markdown bullet points (lines starting with '- ').
- Add exactly one blank line between each paragraph, heading, and bullet point for readability.
- Never add more than one blank line in a row.
- Never use plain lines for lists—always use markdown list syntax.
- If you list more than one fact, always use markdown bullet points.
- Use markdown headings (##, ###) for sections.
- Use numbered lists (1., 2., etc.) where appropriate.
- Use short paragraphs for explanations.
- Do NOT repeat the title or headline.
- Do NOT include any heading like 'TLDR Summary' or similar in your output.
- Make the summary easy to scan and visually appealing.`;

  // Create system message
  const systemMessage = `You are a professional summarizer who creates clear, concise, and accurate summaries.
${markdownInstructions}
${isEli5 ? `\nYou specialize in explaining complex topics in simple terms that a ${eli5Level || 5}-year-old can understand.` : ''}`;

  // Create enhanced user message for news articles
  const newsPrompt = isNewsArticle 
    ? `Create a TLDR summary of the following news article content.\n\n- Do NOT include or repeat the title/headline.\n- Do NOT include any heading like 'TLDR Summary' or similar.\n- Focus on the main facts, events, and key details from the article body.\n- Provide context and insights in about ${summaryLength} words.\n- Use markdown formatting for structure: headings, subheadings, bullet points, numbered lists, and short paragraphs.\n- After each heading, list, and paragraph, add a blank line for clear separation and maximum readability.\n- Make the summary visually appealing and easy to scan.`
    : `Summarize the following in about ${summaryLength} words:\n\n- Use markdown formatting for structure: headings, subheadings, bullet points, numbered lists, and short paragraphs.\n- After each heading, list, and paragraph, add a blank line for clear separation and maximum readability.\n- Make the summary visually appealing and easy to scan.`;
  
  // Create user message
  const userMessage = isEli5
    ? `${getEliPrompt(eli5Level || 5)} The higher the age, the more advanced and detailed the explanation should be. ${newsPrompt}\n\n${content}`
    : `${newsPrompt}\n\n${content}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    headers['Authorization'] = `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`;

    const response = await axios.post(OPENAI_API_URL, {
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: summaryLength * 4, // Approximate tokens needed
    }, { headers });

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from AI service');
    }

    const summary = response.data.choices[0].message.content;
    return { summary };
  } catch (error) {
    console.error('Error summarizing content:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(`AI service error: ${error.response?.data?.error?.message || error.message}`);
    }
    throw new Error('Failed to generate summary');
  }
}

export async function generateAudio(text: string, plan: 'free' | 'pro' | 'premium', type?: 'news' | 'user', title?: string, sourceUrl?: string) {
  // Get the current user's session and access token
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('User must be authenticated to generate audio');
  }

  // Strip markdown formatting from text for better TTS
  const cleanText = stripMarkdownForTTS(text);

  // Prepend title if provided
  let audioText = cleanText;
  if (title) {
    audioText = `${title}. ${cleanText}`;
  }

  try {
    const requestBody: {
      text: string;
      plan: 'free' | 'pro' | 'premium';
      type?: 'news' | 'user';
      sourceUrl?: string;
    } = {
      text: audioText,
      plan,
      type,
    };

    // Include sourceUrl for news items to help with database tracking
    if (type === 'news' && sourceUrl) {
      requestBody.sourceUrl = sourceUrl;
    }

    const response = await axios.post('/api/text-to-speech', requestBody, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    return response.data.audioUrl;
  } catch (error) {
    const err = error as { response?: { status: number; data?: { error?: string } } };
    console.error('Error generating audio:', err);
    // If error is a 403 from backend, extract and throw the message
    if (err.response && err.response.status === 403) {
      throw new Error(err.response.data?.error || 'Audio is only available for summaries up to 700 characters on the free plan. Upgrade to Pro for longer audio.');
    }
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

    // Create a timeout promise that rejects after 45 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Unable to extract content from this domain. This may be due to:\n\n• The website has complex security or structure\n• The site may block automated access\n• Network connectivity issues\n\n💡 Try one of these alternatives:\n• Copy and paste the content directly\n• Try a different website or article\n• Use a direct link to the article content'));
      }, 45000); // 45 second timeout
    });

    // Create the actual request promise
    const requestPromise = axios.post('/api/extract-url', { url }, { 
      headers,
      timeout: 40000 // Axios timeout slightly less than our custom timeout
    });

    // Race between the request and timeout
    const response = await Promise.race([requestPromise, timeoutPromise]);
    
    return response.data.content;
  } catch (error) {
    console.error('Error extracting content from URL:', error);
    
    // Check if it's our custom timeout error
    if (error instanceof Error && error.message.includes('Unable to extract content from this domain')) {
      throw error; // Re-throw our custom timeout message
    }
    
    // Check for axios timeout
    if (axios.isAxiosError(error) && (error.code === 'ECONNABORTED' || error.message.includes('timeout'))) {
      throw new Error('Unable to extract content from this domain. This may be due to:\n\n• The website has complex security or structure\n• The site may block automated access\n• Network connectivity issues\n\n💡 Try one of these alternatives:\n• Copy and paste the content directly\n• Try a different website or article\n• Use a direct link to the article content');
    }
    
    // Check for other network errors
    if (axios.isAxiosError(error)) {
      if (error.response && (error.response.status === 403 || error.response.status === 429)) {
        throw new Error('Unable to extract content from this domain. The website may be blocking automated access.\n\n💡 Try one of these alternatives:\n• Copy and paste the content directly\n• Try a different website or article');
      }
      if (error.response && error.response.status >= 500) {
        throw new Error('Unable to extract content from this domain due to server issues.\n\n💡 Try one of these alternatives:\n• Copy and paste the content directly\n• Try again in a few minutes\n• Use a different website or article');
      }
    }
    
    throw new Error('Failed to extract content from URL');
  }
}

export async function processFileContent(file: File) {
  // Get the current user's session and access token
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.post('/api/process-file', formData, { headers });
    
    return response.data.content;
  } catch (error) {
    console.error('Error processing file:', error);
    throw new Error('Failed to process file');
  }
}

// TLDR function for news articles - extracts content from URL and creates a concise summary
export async function summarizeUrl(url: string, tldrOptions?: TLDROptions): Promise<string> {
  try {
    // First extract content from the URL
    const content = await extractContentFromUrl(url);
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content could be extracted from the URL');
    }

    // Create a TLDR summary using AI with custom options, specifically for news articles
    const summaryOptions: SummarizeOptions = {
      isEli5: tldrOptions?.isEli5 || false,
      summaryLevel: tldrOptions?.summaryLevel || 2, // Default to short summary for TLDR
      eli5Level: tldrOptions?.eli5Level,
      isNewsArticle: true // Flag to indicate this is a news article
    };

    const result = await summarizeContent(content, summaryOptions);
    if (!result || !result.summary) {
      throw new Error('Failed to generate summary from content');
    }
    return result.summary;
  } catch (error) {
    console.error('Error creating TLDR summary:', error);
    // Rethrow the error with a more specific message
    throw error instanceof Error 
      ? error 
      : new Error('Failed to create TLDR summary');
  }
}
